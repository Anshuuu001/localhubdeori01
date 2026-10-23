/**
 * Sliding window in-memory rate limiter for authentication & OTP operations.
 */
class MemoryRateLimiter {
  constructor() {
    this.buckets = new Map();

    // Auto-cleanup stale buckets every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000).unref();
  }

  getKey(action, identifier) {
    return `${action}:${String(identifier).toLowerCase().trim()}`;
  }

  /**
   * Checks if an action is allowed within the given window.
   * @param {string} action - e.g. 'otp_request', 'login_attempt', 'password_recovery'
   * @param {string} identifier - e.g. phone, email, or IP address
   * @param {number} maxAttempts - maximum allowed operations
   * @param {number} windowSeconds - time window in seconds
   * @returns {{ allowed: boolean, remaining: number, retryAfterSeconds: number }}
   */
  consume(action, identifier, maxAttempts, windowSeconds) {
    const key = this.getKey(action, identifier);
    const now = Date.now();
    const windowMs = windowSeconds * 1000;

    let record = this.buckets.get(key);
    if (!record) {
      record = { timestamps: [] };
      this.buckets.set(key, record);
    }

    // Filter out timestamps outside window
    record.timestamps = record.timestamps.filter(ts => now - ts < windowMs);

    if (record.timestamps.length >= maxAttempts) {
      const oldestInWindow = record.timestamps[0];
      const retryAfterSeconds = Math.ceil((oldestInWindow + windowMs - now) / 1000);
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, retryAfterSeconds),
      };
    }

    record.timestamps.push(now);
    return {
      allowed: true,
      remaining: maxAttempts - record.timestamps.length,
      retryAfterSeconds: 0,
    };
  }

  /**
   * Resets rate limit for a successful event (e.g. successful login resets failed attempt counter).
   */
  reset(action, identifier) {
    const key = this.getKey(action, identifier);
    this.buckets.delete(key);
  }

  cleanup() {
    const now = Date.now();
    const maxAgeMs = 30 * 60 * 1000; // 30 minutes
    for (const [key, record] of this.buckets.entries()) {
      record.timestamps = record.timestamps.filter(ts => now - ts < maxAgeMs);
      if (record.timestamps.length === 0) {
        this.buckets.delete(key);
      }
    }
  }
}

export const rateLimiter = new MemoryRateLimiter();

/**
 * Express middleware helper to enforce rate limiting on sensitive routes.
 */
export function createRateLimitMiddleware({
  action,
  maxAttempts,
  windowSeconds,
  keyGenerator,
  message,
}) {
  return (req, res, next) => {
    const key = keyGenerator ? keyGenerator(req) : (req.ip || 'unknown');
    const result = rateLimiter.consume(action, key, maxAttempts, windowSeconds);

    res.setHeader('X-RateLimit-Limit', maxAttempts);
    res.setHeader('X-RateLimit-Remaining', result.remaining);

    if (!result.allowed) {
      res.setHeader('Retry-After', result.retryAfterSeconds);
      return res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: message || `Too many attempts. Please try again after ${result.retryAfterSeconds} seconds.`,
          retryAfterSeconds: result.retryAfterSeconds,
        },
      });
    }

    next();
  };
}
