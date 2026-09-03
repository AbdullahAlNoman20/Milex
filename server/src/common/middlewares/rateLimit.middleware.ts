import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { env } from '../../config/env';
// In-memory stores (default — no `store` option needed). Per-process only:
// counters reset on restart and aren't shared across multiple instances.
// Acceptable at current single-instance scale; revisit if you ever scale out.

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !env.IS_PRODUCTION,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip ?? '')}:${(req.body?.email || '').toLowerCase()}`,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many login attempts. Please wait a few minutes before trying again.' } },
});

export const mfaRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please wait a few minutes before trying again.' } },
});

export const globalApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

export const exportRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'You\'ve reached the export limit for now. Please try again in an hour.' } },
});

export const searchRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
});