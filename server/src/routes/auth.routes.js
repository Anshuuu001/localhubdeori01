import { Router } from 'express';
import {
  registerWithPassword,
  loginWithPassword,
  requestOtp,
  verifyOtpAndLogin,
  linkVerifiedIdentifier,
  requestPasswordRecovery,
  resetPasswordWithOtp,
  submitAccountRecoveryRequest,
  reauthenticate,
  getMe,
  logout,
  getCsrfToken,
  getProvidersStatus,
} from '../controllers/auth.controller.js';
import { requireAuth, csrfProtection } from '../middleware/auth.middleware.js';
import { createRateLimitMiddleware } from '../services/rateLimiter.service.js';

const router = Router();

// Rate limiting middleware instances
const loginLimiter = createRateLimitMiddleware({
  action: 'login_ip',
  maxAttempts: 10,
  windowSeconds: 15 * 60,
  message: 'Too many authentication attempts from this IP address. Please try again later.',
});

const otpLimiter = createRateLimitMiddleware({
  action: 'otp_ip',
  maxAttempts: 10,
  windowSeconds: 10 * 60,
  message: 'Too many OTP requests from this network. Please wait a few minutes.',
});

// Public Auth Endpoints
router.get('/csrf', getCsrfToken);
router.get('/me', getMe);
router.get('/providers', getProvidersStatus);

router.post('/register', loginLimiter, registerWithPassword);
router.post('/login', loginLimiter, loginWithPassword);
router.post('/otp/request', otpLimiter, requestOtp);
router.post('/otp/verify', verifyOtpAndLogin);

// Password recovery & Account recovery
router.post('/password-recovery/request', requestPasswordRecovery);
router.post('/password-recovery/reset', resetPasswordWithOtp);
router.post('/recovery-request', submitAccountRecoveryRequest);

// Authenticated Endpoints
router.post('/logout', requireAuth, csrfProtection, logout);
router.post('/reauth', requireAuth, csrfProtection, reauthenticate);
router.post('/link-identifier', requireAuth, csrfProtection, linkVerifiedIdentifier);

export default router;
