// server/src/common/middlewares/rateLimit.middleware.ts
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { Request } from 'express';
import { env } from '../../config/env';
import { verifyAccessToken } from '../utils/jwt.util';

// Per-SESSION key instead of per-IP. An entire office behind one NAT/public
// IP (or a shared mobile-data CGNAT) used to share a single bucket, so 60
// staff would 429 each other constantly. Keyed off the access-token cookie
// (hashed, never logged), each logged-in person gets their own budget.
// Anonymous traffic still falls back to IP, which is exactly what a flood
// looks like — so DDoS protection is preserved.
const sessionKey = (req: Request): string => {
  // Keyed off the USER ID, not the token itself. Hashing the raw token meant
  // the bucket reset every time the 15-minute access cookie rotated, which
  // quietly made the limit far weaker than the configured value. The id is
  // read with decode() (no verification) — an attacker forging it only ever
  // shares someone else's smaller budget, never gains a bigger one.
  const authenticatedId = (req as any).user?.id;
  if (typeof authenticatedId === 'string' && authenticatedId) return `u:${authenticatedId}`;

  // The token is VERIFIED, never merely decoded. Decoding alone let anyone
  // hand-craft a cookie with a fresh `sub` on every request and so get an
  // unlimited number of fresh buckets, which made this limiter decorative.
  const token = (req as any).cookies?.access_token;
  if (typeof token === 'string' && token.length > 0) {
    try {
      const payload = verifyAccessToken(token);
      if (payload?.sub) return `u:${payload.sub}`;
    } catch {
      /* forged or expired — falls through to the IP bucket below */
    }
  }
  return `i:${ipKeyGenerator(req.ip ?? '')}`;
};

const ipKey = (req: Request): string => ipKeyGenerator(req.ip ?? '');

// Layer 1 — volumetric flood guard. Deliberately high: a whole office of
// ~60 people peaks well under this, but a single flooding host does not.
export const ddosLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 3000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipKey,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many requests from your network. Please wait a moment and try again.' },
  },
});

// Layer 2 — per-person fair-use budget.
export const globalApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: sessionKey,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'You\'re doing that a bit too quickly. Please wait a few seconds and try again.' },
  },
});

export const searchRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: sessionKey,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many searches in a row. Please wait a few seconds and try again.' },
  },
});

// Brute-force guard, scoped to one account at a time so one person's typos
// can never lock out a colleague on the same office IP.
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !env.IS_PRODUCTION,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip ?? '')}:${(req.body?.email || '').toLowerCase()}`,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many login attempts for this account. Please wait a few minutes before trying again.' },
  },
});

// Credential-stuffing guard: catches one host cycling through many emails,
// while still allowing a whole office to sign in each morning.
export const loginIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 150,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !env.IS_PRODUCTION,
  keyGenerator: ipKey,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many login attempts from your network. Please wait a few minutes before trying again.' },
  },
});

export const refreshRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: sessionKey,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Your session could not be refreshed right now. Please log in again.' },
  },
});

export const mfaRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: sessionKey,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please wait a few minutes before trying again.' } },
});

export const exportRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: sessionKey,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'You\'ve reached the export limit for now. Please try again in an hour.' } },
});