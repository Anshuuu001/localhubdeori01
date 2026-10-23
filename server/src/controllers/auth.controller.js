import crypto from 'crypto';
import { executeQuery } from '../config/database.js';
import { env } from '../config/env.js';
import {
  hashPassword,
  comparePassword,
  generateToken,
  hashToken,
  generateNumericOtp,
  hashOtp,
  verifyOtp,
  generateCsrfSecret,
} from '../services/crypto.service.js';
import { sendSmsOtp, getActiveSmsProviderInfo } from '../services/sms.service.js';
import { sendEmail, getActiveEmailProviderInfo } from '../services/email.service.js';
import { logAuditEvent } from '../services/audit.service.js';
import { rateLimiter } from '../services/rateLimiter.service.js';

const COOKIE_MAX_AGE_MS = env.auth.sessionDurationDays * 24 * 60 * 60 * 1000;

function setSessionCookies(res, rawToken, csrfSecret) {
  res.cookie('lhx_session', rawToken, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE_MS,
    path: '/',
  });

  // CSRF token in accessible cookie for client-side headers
  res.cookie('lhx_csrf', csrfSecret, {
    httpOnly: false,
    secure: env.isProduction,
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE_MS,
    path: '/',
  });
}

function clearSessionCookies(res) {
  res.clearCookie('lhx_session', { path: '/' });
  res.clearCookie('lhx_csrf', { path: '/' });
}

/**
 * Creates an active database session record and sets cookies.
 */
async function createDatabaseSession(userId, req, res) {
  const sessionId = crypto.randomUUID();
  const rawToken = generateToken(32);
  const tokenHash = hashToken(rawToken);
  const csrfSecret = generateCsrfSecret();
  const expiresAt = new Date(Date.now() + COOKIE_MAX_AGE_MS);

  const userAgent = req.headers['user-agent'] || 'Unknown Device';
  const ipAddress = req.ip || req.connection.remoteAddress || '127.0.0.1';
  const deviceLabel = userAgent.slice(0, 100);

  await executeQuery(
    `INSERT INTO auth_sessions 
      (id, user_id, token_hash, csrf_secret, user_agent, ip_address, device_label, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [sessionId, userId, tokenHash, csrfSecret, userAgent.slice(0, 255), ipAddress.slice(0, 45), deviceLabel, expiresAt]
  );

  setSessionCookies(res, rawToken, csrfSecret);

  return { sessionId, rawToken, csrfSecret, expiresAt };
}

/**
 * Register with Email and Password.
 */
export async function registerWithPassword(req, res) {
  const { fullName, email, password } = req.body;

  if (!fullName || !email || !password) {
    return res.status(400).json({
      error: { code: 'INVALID_INPUT', message: 'Full name, email, and password are required.' },
    });
  }

  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
    return res.status(400).json({
      error: { code: 'INVALID_EMAIL', message: 'Please provide a valid email address.' },
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      error: { code: 'WEAK_PASSWORD', message: 'Password must be at least 8 characters long.' },
    });
  }

  // Check existing user
  const [existing] = await executeQuery('SELECT id FROM users WHERE email = ?', [cleanEmail]);
  if (existing.length > 0) {
    return res.status(409).json({
      error: { code: 'EMAIL_ALREADY_EXISTS', message: 'An account with this email already exists.' },
    });
  }

  const passwordHash = await hashPassword(password);
  const userId = crypto.randomUUID();

  await executeQuery(
    `INSERT INTO users (id, full_name, email, is_email_verified, password_hash, status)
     VALUES (?, ?, ?, FALSE, ?, 'active')`,
    [userId, fullName.trim(), cleanEmail, passwordHash]
  );

  // Automatically start an active session
  const session = await createDatabaseSession(userId, req, res);

  await logAuditEvent({
    actorId: userId,
    action: 'auth.register_password',
    entityType: 'user',
    entityId: userId,
    details: { email: cleanEmail, method: 'email_password' },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  return res.status(201).json({
    message: 'Account created successfully. Please verify your email.',
    user: {
      id: userId,
      fullName: fullName.trim(),
      email: cleanEmail,
      isEmailVerified: false,
      phone: null,
      isPhoneVerified: false,
      status: 'active',
    },
    csrfToken: session.csrfSecret,
    token: session.rawToken,
  });
}

/**
 * Login with Email and Password.
 */
export async function loginWithPassword(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: { code: 'INVALID_INPUT', message: 'Email and password are required.' },
    });
  }

  const cleanEmail = email.trim().toLowerCase();

  // Rate limiting check
  const rateKey = `login_email:${cleanEmail}`;
  const rateCheck = rateLimiter.consume('login_attempt', rateKey, 5, 15 * 60);
  if (!rateCheck.allowed) {
    return res.status(429).json({
      error: {
        code: 'TOO_MANY_ATTEMPTS',
        message: `Too many failed login attempts. Please retry after ${rateCheck.retryAfterSeconds} seconds.`,
      },
    });
  }

  const [users] = await executeQuery(
    'SELECT id, full_name, email, is_email_verified, phone, is_phone_verified, password_hash, status FROM users WHERE email = ?',
    [cleanEmail]
  );

  if (users.length === 0 || !users[0].password_hash) {
    // Avoid user enumeration: generic error
    return res.status(401).json({
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' },
    });
  }

  const user = users[0];

  if (user.status === 'suspended') {
    return res.status(403).json({
      error: { code: 'ACCOUNT_SUSPENDED', message: 'This account has been suspended.' },
    });
  }

  const isPasswordValid = await comparePassword(password, user.password_hash);
  if (!isPasswordValid) {
    await logAuditEvent({
      action: 'auth.login_failed',
      entityType: 'user',
      entityId: user.id,
      details: { email: cleanEmail, reason: 'bad_password' },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.status(401).json({
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' },
    });
  }

  // Reset failed login counter on success
  rateLimiter.reset('login_attempt', rateKey);

  const session = await createDatabaseSession(user.id, req, res);

  await logAuditEvent({
    actorId: user.id,
    action: 'auth.login_password',
    entityType: 'user',
    entityId: user.id,
    details: { email: cleanEmail },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  return res.json({
    message: 'Logged in successfully.',
    user: {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      isEmailVerified: Boolean(user.is_email_verified),
      phone: user.phone,
      isPhoneVerified: Boolean(user.is_phone_verified),
      status: user.status,
    },
    csrfToken: session.csrfSecret,
    token: session.rawToken,
  });
}

/**
 * Request an OTP challenge for Login, Registration, Verification, or Password Recovery.
 */
export async function requestOtp(req, res) {
  const { identifier, channel, purpose } = req.body;

  if (!identifier || !channel || !purpose) {
    return res.status(400).json({
      error: { code: 'INVALID_INPUT', message: 'Identifier, channel, and purpose are required.' },
    });
  }

  const validChannels = ['phone_sms', 'email'];
  if (!validChannels.includes(channel)) {
    return res.status(400).json({
      error: { code: 'INVALID_CHANNEL', message: 'Channel must be phone_sms or email.' },
    });
  }

  const validPurposes = [
    'login',
    'register',
    'verify_phone',
    'verify_email',
    'password_reset',
    'account_link',
    'reauth',
  ];
  if (!validPurposes.includes(purpose)) {
    return res.status(400).json({
      error: { code: 'INVALID_PURPOSE', message: 'Invalid OTP purpose specified.' },
    });
  }

  const cleanId = identifier.trim().toLowerCase();

  // Enforce rate limiting: max 3 OTP requests per 10 minutes per identifier
  const otpRateCheck = rateLimiter.consume('otp_request', cleanId, 3, 10 * 60);
  if (!otpRateCheck.allowed) {
    return res.status(429).json({
      error: {
        code: 'OTP_RATE_LIMIT',
        message: `Too many OTP requests. Please wait ${otpRateCheck.retryAfterSeconds} seconds before requesting another code.`,
      },
    });
  }

  // Invalidate any existing unused challenge for this identifier + purpose
  await executeQuery(
    `UPDATE otp_challenges 
     SET consumed_at = NOW() 
     WHERE identifier = ? AND purpose = ? AND consumed_at IS NULL`,
    [cleanId, purpose]
  );

  // Generate 6-digit numeric OTP and secure hash
  const rawOtp = generateNumericOtp();
  const challengeId = crypto.randomUUID();
  const otpHash = hashOtp(cleanId, rawOtp);
  const expiresAt = new Date(Date.now() + env.auth.otpExpiryMinutes * 60 * 1000);

  await executeQuery(
    `INSERT INTO otp_challenges 
      (id, identifier, channel, purpose, otp_hash, attempts_count, max_attempts, expires_at, ip_address)
     VALUES (?, ?, ?, ?, ?, 0, 5, ?, ?)`,
    [challengeId, cleanId, channel, purpose, otpHash, expiresAt, req.ip || null]
  );

  let providerResult = null;
  if (channel === 'phone_sms') {
    providerResult = await sendSmsOtp({
      phone: cleanId,
      otp: rawOtp,
      purpose,
    });
  } else {
    providerResult = await sendEmail({
      to: cleanId,
      subject: `LocalHub X - Your Security Code (${purpose})`,
      otp: rawOtp,
      text: `Your LocalHub X verification code is ${rawOtp}. Valid for 10 minutes.`,
    });
  }

  return res.json({
    message: `Security code has been dispatched to ${cleanId.replace(/(.{2})(.*)(.{2})/, '$1***$3')}.`,
    channel,
    purpose,
    expiresInMinutes: env.auth.otpExpiryMinutes,
    provider: providerResult?.provider || 'default',
    isDevelopmentMock: Boolean(providerResult?.isDevelopmentMock),
    // Transparent development advisory:
    devNotice: providerResult?.isDevelopmentMock
      ? 'DEV NOTICE: Running with development mock provider. Credentials not configured in .env.'
      : null,
  });
}

/**
 * Verify OTP and authenticate user (for phone OTP login/register or reauth).
 */
export async function verifyOtpAndLogin(req, res) {
  const { identifier, otp, purpose, fullName } = req.body;

  if (!identifier || !otp || !purpose) {
    return res.status(400).json({
      error: { code: 'INVALID_INPUT', message: 'Identifier, otp, and purpose are required.' },
    });
  }

  const cleanId = identifier.trim().toLowerCase();

  // Find active challenge
  const [challenges] = await executeQuery(
    `SELECT id, otp_hash, attempts_count, max_attempts, expires_at, channel, consumed_at
     FROM otp_challenges
     WHERE identifier = ? AND purpose = ? AND consumed_at IS NULL
     ORDER BY created_at DESC LIMIT 1`,
    [cleanId, purpose]
  );

  if (challenges.length === 0) {
    return res.status(400).json({
      error: { code: 'NO_ACTIVE_CHALLENGE', message: 'No active OTP request found. Please request a new code.' },
    });
  }

  const challenge = challenges[0];

  // Check expiration
  if (new Date() > new Date(challenge.expires_at)) {
    await executeQuery('UPDATE otp_challenges SET consumed_at = NOW() WHERE id = ?', [challenge.id]);
    return res.status(400).json({
      error: { code: 'OTP_EXPIRED', message: 'Security code has expired. Please request a new code.' },
    });
  }

  // Check attempt limit
  if (challenge.attempts_count >= challenge.max_attempts) {
    await executeQuery('UPDATE otp_challenges SET consumed_at = NOW() WHERE id = ?', [challenge.id]);
    return res.status(400).json({
      error: { code: 'MAX_ATTEMPTS_EXCEEDED', message: 'Maximum verification attempts exceeded. Please request a new code.' },
    });
  }

  // Increment attempts
  await executeQuery('UPDATE otp_challenges SET attempts_count = attempts_count + 1 WHERE id = ?', [challenge.id]);

  // Verify hash
  const isValid = verifyOtp(cleanId, otp, challenge.otp_hash);
  if (!isValid) {
    const remaining = challenge.max_attempts - (challenge.attempts_count + 1);
    return res.status(400).json({
      error: {
        code: 'INVALID_OTP',
        message: `Incorrect code entered. ${remaining > 0 ? `${remaining} attempts remaining.` : 'Challenge locked.'}`,
        remainingAttempts: Math.max(0, remaining),
      },
    });
  }

  // Mark challenge consumed (Single-use enforcement)
  await executeQuery('UPDATE otp_challenges SET consumed_at = NOW() WHERE id = ?', [challenge.id]);

  // Determine user action based on channel/purpose
  const isPhone = challenge.channel === 'phone_sms';
  const queryField = isPhone ? 'phone' : 'email';

  const [existingUsers] = await executeQuery(
    `SELECT id, full_name, email, is_email_verified, phone, is_phone_verified, status 
     FROM users WHERE ${queryField} = ?`,
    [cleanId]
  );

  let user = existingUsers[0] || null;

  if (!user) {
    // If user does not exist, create new user account
    const newUserId = crypto.randomUUID();
    const displayName = fullName?.trim() || (isPhone ? `Deori Citizen (${cleanId.slice(-4)})` : cleanId.split('@')[0]);

    if (isPhone) {
      await executeQuery(
        `INSERT INTO users (id, full_name, phone, is_phone_verified, status)
         VALUES (?, ?, ?, TRUE, 'active')`,
        [newUserId, displayName, cleanId]
      );
    } else {
      await executeQuery(
        `INSERT INTO users (id, full_name, email, is_email_verified, status)
         VALUES (?, ?, ?, TRUE, 'active')`,
        [newUserId, displayName, cleanId]
      );
    }

    user = {
      id: newUserId,
      full_name: displayName,
      email: isPhone ? null : cleanId,
      is_email_verified: !isPhone,
      phone: isPhone ? cleanId : null,
      is_phone_verified: isPhone,
      status: 'active',
    };

    await logAuditEvent({
      actorId: newUserId,
      action: 'auth.register_otp',
      entityType: 'user',
      entityId: newUserId,
      details: { channel: challenge.channel, identifier: cleanId },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  } else {
    // Existing user: mark identifier verified if not already verified
    const updateField = isPhone ? 'is_phone_verified = TRUE' : 'is_email_verified = TRUE';
    await executeQuery(`UPDATE users SET ${updateField} WHERE id = ?`, [user.id]);
    if (isPhone) user.is_phone_verified = true;
    else user.is_email_verified = true;

    await logAuditEvent({
      actorId: user.id,
      action: 'auth.login_otp',
      entityType: 'user',
      entityId: user.id,
      details: { channel: challenge.channel, identifier: cleanId },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  // Create active session
  const session = await createDatabaseSession(user.id, req, res);

  return res.json({
    message: 'Verification successful.',
    user: {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      isEmailVerified: Boolean(user.is_email_verified),
      phone: user.phone,
      isPhoneVerified: Boolean(user.is_phone_verified),
      status: user.status,
    },
    csrfToken: session.csrfSecret,
    token: session.rawToken,
  });
}

/**
 * Safe Account Linking: Connect a verified phone or email to an existing authenticated account.
 * Requires verified OTP proof of control.
 */
export async function linkVerifiedIdentifier(req, res) {
  if (!req.user) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
    });
  }

  const { identifier, otp, channel } = req.body;
  if (!identifier || !otp || !channel) {
    return res.status(400).json({
      error: { code: 'INVALID_INPUT', message: 'Identifier, otp, and channel are required.' },
    });
  }

  const cleanId = identifier.trim().toLowerCase();
  const isPhone = channel === 'phone_sms';
  const targetCol = isPhone ? 'phone' : 'email';
  const targetVerifiedCol = isPhone ? 'is_phone_verified' : 'is_email_verified';

  // Safeguard: Check if another user already owns and verified this identifier
  const [clashing] = await executeQuery(
    `SELECT id FROM users WHERE ${targetCol} = ? AND id != ?`,
    [cleanId, req.user.id]
  );

  if (clashing.length > 0) {
    return res.status(409).json({
      error: {
        code: 'IDENTIFIER_ALREADY_LINKED',
        message: `This ${isPhone ? 'phone number' : 'email'} is already registered to another account. Merging without direct migration is prohibited for security.`,
      },
    });
  }

  // Verify the OTP challenge
  const [challenges] = await executeQuery(
    `SELECT id, otp_hash, attempts_count, max_attempts, expires_at 
     FROM otp_challenges 
     WHERE identifier = ? AND purpose = 'account_link' AND consumed_at IS NULL
     ORDER BY created_at DESC LIMIT 1`,
    [cleanId]
  );

  if (challenges.length === 0) {
    return res.status(400).json({
      error: { code: 'NO_CHALLENGE', message: 'No pending OTP verification found for linking.' },
    });
  }

  const challenge = challenges[0];
  if (new Date() > new Date(challenge.expires_at)) {
    return res.status(400).json({
      error: { code: 'EXPIRED_CODE', message: 'Verification code has expired.' },
    });
  }

  const isValid = verifyOtp(cleanId, otp, challenge.otp_hash);
  if (!isValid) {
    return res.status(400).json({
      error: { code: 'INVALID_OTP', message: 'Invalid verification code.' },
    });
  }

  // Burn challenge
  await executeQuery('UPDATE otp_challenges SET consumed_at = NOW() WHERE id = ?', [challenge.id]);

  // Update user record
  await executeQuery(
    `UPDATE users SET ${targetCol} = ?, ${targetVerifiedCol} = TRUE WHERE id = ?`,
    [cleanId, req.user.id]
  );

  await logAuditEvent({
    actorId: req.user.id,
    action: 'account.link_identifier',
    entityType: 'user',
    entityId: req.user.id,
    details: { linkedField: targetCol, identifier: cleanId },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  return res.json({
    message: `${isPhone ? 'Phone number' : 'Email'} successfully verified and linked to your account.`,
  });
}

/**
 * Request Password Recovery (uniform response to prevent account enumeration).
 */
export async function requestPasswordRecovery(req, res) {
  const { identifier } = req.body;

  if (!identifier) {
    return res.status(400).json({
      error: { code: 'INVALID_INPUT', message: 'Please provide your registered email or phone.' },
    });
  }

  const cleanId = identifier.trim().toLowerCase();

  // Rate limiting: 3 recovery requests per 15 minutes
  const rateKey = `pwd_recov:${cleanId}`;
  const rateCheck = rateLimiter.consume('password_recovery', rateKey, 3, 15 * 60);
  if (!rateCheck.allowed) {
    return res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Too many password reset requests. Please wait ${rateCheck.retryAfterSeconds} seconds.`,
      },
    });
  }

  // Uniform response message whether the user exists or not
  const uniformMessage =
    'If an account associated with this contact identifier exists, password recovery instructions have been dispatched.';

  const isEmail = cleanId.includes('@');
  const [users] = await executeQuery(
    `SELECT id, email, phone FROM users WHERE ${isEmail ? 'email' : 'phone'} = ?`,
    [cleanId]
  );

  if (users.length > 0) {
    const rawOtp = generateNumericOtp();
    const challengeId = crypto.randomUUID();
    const otpHash = hashOtp(cleanId, rawOtp);
    const channel = isEmail ? 'email' : 'phone_sms';
    const expiresAt = new Date(Date.now() + env.auth.otpExpiryMinutes * 60 * 1000);

    await executeQuery(
      `INSERT INTO otp_challenges 
        (id, identifier, channel, purpose, otp_hash, attempts_count, max_attempts, expires_at, ip_address)
       VALUES (?, ?, ?, 'password_reset', ?, 0, 5, ?, ?)`,
      [challengeId, cleanId, channel, otpHash, expiresAt, req.ip || null]
    );

    if (isEmail) {
      await sendEmail({
        to: cleanId,
        subject: 'LocalHub X - Password Reset Security Code',
        otp: rawOtp,
        text: `Your password reset code is ${rawOtp}. Valid for 10 minutes. If you did not request this, please secure your account.`,
      });
    } else {
      await sendSmsOtp({
        phone: cleanId,
        otp: rawOtp,
        purpose: 'password_reset',
      });
    }

    await logAuditEvent({
      actorId: users[0].id,
      action: 'auth.password_recovery_requested',
      entityType: 'user',
      entityId: users[0].id,
      details: { channel },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  return res.json({
    message: uniformMessage,
    identifier: cleanId.replace(/(.{2})(.*)(.{2})/, '$1***$3'),
  });
}

/**
 * Reset Password using verified OTP.
 * Invalidates all existing active sessions on success.
 */
export async function resetPasswordWithOtp(req, res) {
  const { identifier, otp, newPassword } = req.body;

  if (!identifier || !otp || !newPassword) {
    return res.status(400).json({
      error: { code: 'INVALID_INPUT', message: 'Identifier, otp, and new password are required.' },
    });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({
      error: { code: 'WEAK_PASSWORD', message: 'Password must be at least 8 characters long.' },
    });
  }

  const cleanId = identifier.trim().toLowerCase();

  const [challenges] = await executeQuery(
    `SELECT id, otp_hash, attempts_count, max_attempts, expires_at 
     FROM otp_challenges
     WHERE identifier = ? AND purpose = 'password_reset' AND consumed_at IS NULL
     ORDER BY created_at DESC LIMIT 1`,
    [cleanId]
  );

  if (challenges.length === 0) {
    return res.status(400).json({
      error: { code: 'NO_CHALLENGE', message: 'No active password reset challenge found.' },
    });
  }

  const challenge = challenges[0];
  if (new Date() > new Date(challenge.expires_at)) {
    return res.status(400).json({
      error: { code: 'EXPIRED_CODE', message: 'Security code has expired. Please request a new one.' },
    });
  }

  const isValid = verifyOtp(cleanId, otp, challenge.otp_hash);
  if (!isValid) {
    await executeQuery('UPDATE otp_challenges SET attempts_count = attempts_count + 1 WHERE id = ?', [challenge.id]);
    return res.status(400).json({
      error: { code: 'INVALID_OTP', message: 'Incorrect reset code entered.' },
    });
  }

  // Burn challenge
  await executeQuery('UPDATE otp_challenges SET consumed_at = NOW() WHERE id = ?', [challenge.id]);

  // Find user
  const isEmail = cleanId.includes('@');
  const [users] = await executeQuery(
    `SELECT id FROM users WHERE ${isEmail ? 'email' : 'phone'} = ?`,
    [cleanId]
  );

  if (users.length === 0) {
    return res.status(404).json({
      error: { code: 'USER_NOT_FOUND', message: 'User account not found.' },
    });
  }

  const user = users[0];
  const newHash = await hashPassword(newPassword);

  // Update password
  await executeQuery('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, user.id]);

  // Invalidate all existing active sessions for this user for security
  await executeQuery(
    'UPDATE auth_sessions SET is_revoked = TRUE, revoked_at = NOW() WHERE user_id = ?',
    [user.id]
  );

  clearSessionCookies(res);

  await logAuditEvent({
    actorId: user.id,
    action: 'auth.password_reset_success',
    entityType: 'user',
    entityId: user.id,
    details: { method: 'otp_reset', sessionsRevoked: true },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  return res.json({
    message: 'Your password has been reset successfully. Please log in with your new password.',
  });
}

/**
 * Loss of access to both identifiers: submit formal manual review request.
 */
export async function submitAccountRecoveryRequest(req, res) {
  const { fullName, lostIdentifier, alternateContact, details } = req.body;

  if (!fullName || !lostIdentifier || !alternateContact || !details) {
    return res.status(400).json({
      error: {
        code: 'INVALID_INPUT',
        message: 'Full name, lost identifier, alternate contact, and circumstances description are required.',
      },
    });
  }

  const requestId = crypto.randomUUID();
  await executeQuery(
    `INSERT INTO account_recovery_requests 
      (id, full_name, lost_identifier, alternate_contact, details, status, ip_address)
     VALUES (?, ?, ?, ?, ?, 'pending_review', ?)`,
    [
      requestId,
      fullName.trim(),
      lostIdentifier.trim(),
      alternateContact.trim(),
      details.trim(),
      req.ip || null,
    ]
  );

  await logAuditEvent({
    action: 'account.loss_recovery_submitted',
    entityType: 'account_recovery_request',
    entityId: requestId,
    details: { lostIdentifier: lostIdentifier.trim(), alternateContact: alternateContact.trim() },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  return res.status(201).json({
    message:
      'Account recovery request received. A support team administrator will review your case and contact you via your alternate contact method.',
    requestId,
    status: 'pending_review',
  });
}

/**
 * Re-authenticate current session for sensitive operations.
 */
export async function reauthenticate(req, res) {
  if (!req.user || !req.session) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
    });
  }

  const { password, otp } = req.body;

  if (!password && !otp) {
    return res.status(400).json({
      error: { code: 'INVALID_INPUT', message: 'Password or OTP is required for security confirmation.' },
    });
  }

  if (password) {
    const [rows] = await executeQuery('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    if (rows.length === 0 || !rows[0].password_hash) {
      return res.status(400).json({
        error: { code: 'NO_PASSWORD_SET', message: 'Account does not have a password set. Re-authenticate via phone OTP.' },
      });
    }

    const isValid = await comparePassword(password, rows[0].password_hash);
    if (!isValid) {
      return res.status(401).json({
        error: { code: 'INVALID_PASSWORD', message: 'Incorrect password.' },
      });
    }
  } else if (otp) {
    const identifier = req.user.phone || req.user.email;
    const [challenges] = await executeQuery(
      `SELECT id, otp_hash FROM otp_challenges 
       WHERE identifier = ? AND purpose = 'reauth' AND consumed_at IS NULL
       ORDER BY created_at DESC LIMIT 1`,
      [identifier]
    );

    if (challenges.length === 0 || !verifyOtp(identifier, otp, challenges[0].otp_hash)) {
      return res.status(401).json({
        error: { code: 'INVALID_OTP', message: 'Incorrect re-authentication OTP.' },
      });
    }

    await executeQuery('UPDATE otp_challenges SET consumed_at = NOW() WHERE id = ?', [challenges[0].id]);
  }

  // Update session reauth timestamp
  await executeQuery('UPDATE auth_sessions SET last_reauth_at = NOW() WHERE id = ?', [req.session.id]);
  req.session.lastReauthAt = new Date().toISOString();

  await logAuditEvent({
    actorId: req.user.id,
    action: 'auth.reauthenticated',
    entityType: 'session',
    entityId: req.session.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  return res.json({
    message: 'Re-authentication verified successfully. You may now perform sensitive actions.',
    reauthenticatedAt: req.session.lastReauthAt,
  });
}

/**
 * Returns current authenticated user and session metadata.
 */
export async function getMe(req, res) {
  if (!req.user) {
    return res.json({
      authenticated: false,
      user: null,
      session: null,
      csrfToken: null,
    });
  }

  return res.json({
    authenticated: true,
    user: req.user,
    session: {
      id: req.session.id,
      lastActiveAt: req.session.lastActiveAt,
      deviceLabel: req.session.deviceLabel,
    },
    csrfToken: req.session.csrfSecret,
  });
}

/**
 * Log out and invalidate current session.
 */
export async function logout(req, res) {
  if (req.session?.id) {
    await executeQuery(
      'UPDATE auth_sessions SET is_revoked = TRUE, revoked_at = NOW() WHERE id = ?',
      [req.session.id]
    );

    if (req.user?.id) {
      await logAuditEvent({
        actorId: req.user.id,
        action: 'auth.logout',
        entityType: 'session',
        entityId: req.session.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
    }
  }

  clearSessionCookies(res);

  return res.json({
    message: 'Logged out successfully.',
  });
}

/**
 * CSRF token endpoint for clients.
 */
export async function getCsrfToken(req, res) {
  const token = req.session?.csrfSecret || generateCsrfSecret();
  res.cookie('lhx_csrf', token, {
    httpOnly: false,
    secure: env.isProduction,
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE_MS,
    path: '/',
  });
  return res.json({ csrfToken: token });
}

export function getProvidersStatus(req, res) {
  return res.json({
    sms: getActiveSmsProviderInfo(),
    email: getActiveEmailProviderInfo(),
  });
}
