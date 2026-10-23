import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { env } from '../config/env.js';

const BCRYPT_SALT_ROUNDS = 12;

/**
 * Strong password hashing using bcrypt with 12 salt rounds.
 * Never stores plaintext passwords.
 */
export async function hashPassword(plainPassword) {
  if (!plainPassword || typeof plainPassword !== 'string') {
    throw new Error('Password must be a non-empty string');
  }
  return await bcrypt.hash(plainPassword, BCRYPT_SALT_ROUNDS);
}

/**
 * Safe password verification using constant-time comparison.
 */
export async function comparePassword(plainPassword, passwordHash) {
  if (!plainPassword || !passwordHash) return false;
  return await bcrypt.compare(plainPassword, passwordHash);
}

/**
 * Cryptographically random token for sessions and invitations.
 */
export function generateToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * SHA-256 hash for storing session/invitation token representations safely in the DB.
 */
export function hashToken(token) {
  if (!token) return '';
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generates a 6-digit numeric OTP.
 */
export function generateNumericOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * HMAC-SHA256 hash of OTP keyed by identifier and system OTP secret.
 * Storing OTP hashes prevents database dumps from yielding valid OTPs.
 */
export function hashOtp(identifier, otp) {
  const normalizedId = String(identifier).trim().toLowerCase();
  return crypto
    .createHmac('sha256', env.auth.otpSecret)
    .update(`${normalizedId}:${otp}`)
    .digest('hex');
}

/**
 * Timing-safe comparison of OTP hashes.
 */
export function verifyOtp(identifier, plainOtp, storedHash) {
  if (!identifier || !plainOtp || !storedHash) return false;
  const computed = hashOtp(identifier, plainOtp);
  try {
    const computedBuf = Buffer.from(computed, 'hex');
    const storedBuf = Buffer.from(storedHash, 'hex');
    if (computedBuf.length !== storedBuf.length) return false;
    return crypto.timingSafeEqual(computedBuf, storedBuf);
  } catch {
    return false;
  }
}

/**
 * Generates a random CSRF secret.
 */
export function generateCsrfSecret() {
  return crypto.randomBytes(24).toString('hex');
}
