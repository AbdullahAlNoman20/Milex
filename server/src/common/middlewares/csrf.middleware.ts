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
    secure: env.IS_PRODUCTION,
    sameSite: 'strict',
    domain: env.COOKIE_DOMAIN,
  });
  return token;
};

// Double-submit cookie pattern on all state-changing requests.
export const verifyCsrf = (req: Request, res: Response, next: NextFunction) => {
  if (!STATE_CHANGING_METHODS.includes(req.method)) return next();

  const cookieToken = (req as any).cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.headers[CSRF_HEADER_NAME];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return sendError(res, 403, 'CSRF_VALIDATION_FAILED', 'CSRF token missing or invalid');
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