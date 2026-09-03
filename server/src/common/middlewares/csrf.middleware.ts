// src/common/middlewares/csrf.middleware.ts
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { sendError } from '../utils/apiResponse.util';
import { env } from '../../config/env';

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const STATE_CHANGING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

export const issueCsrfCookie = (res: Response) => {
  const token = crypto.randomBytes(32).toString('hex');
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: true,
    sameSite: 'none',
    domain: env.COOKIE_DOMAIN === 'localhost' ? undefined : env.COOKIE_DOMAIN,
  });
  return token;
};
// Double-submit cookie pattern on all state-changing requests.
export const verifyCsrf = (req: Request, res: Response, next: NextFunction) => {
  if (!STATE_CHANGING_METHODS.includes(req.method)) return next();

  const cookieToken = (req as any).cookies?.[CSRF_COOKIE_NAME];
  const rawHeaderToken = req.headers[CSRF_HEADER_NAME];
  const headerToken = Array.isArray(rawHeaderToken) ? rawHeaderToken[0] : rawHeaderToken;

  const isValid =
    typeof cookieToken === 'string' &&
    typeof headerToken === 'string' &&
    cookieToken.length === headerToken.length &&
    crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken));

  if (!isValid) {
    return sendError(res, 403, 'CSRF_VALIDATION_FAILED', 'For your security, please refresh the page and try again.');
  }
  next();
};

export const verifyOriginForSensitiveRoutes = (allowedOrigin: string) => (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const origin = req.headers.origin || req.headers.referer;
  if (!origin || !origin.startsWith(allowedOrigin)) {
    return sendError(res, 403, 'ORIGIN_VALIDATION_FAILED', 'Request origin not allowed');
  }
  next();
};