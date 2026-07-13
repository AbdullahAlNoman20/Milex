// src/modules/auth/auth.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import { sendSuccess, sendError } from '../../common/utils/apiResponse.util';
import { env } from '../../config/env';
import { issueCsrfCookie } from '../../common/middlewares/csrf.middleware';

const REFRESH_COOKIE_NAME = 'refresh_token';
const ACCESS_COOKIE_NAME = 'access_token';

const setAuthCookies = (res: Response, accessToken: string, refreshToken: string) => {
  const cookieOpts = {
    httpOnly: true,
    secure: env.IS_PRODUCTION,
    sameSite: 'strict' as const,
    domain: env.COOKIE_DOMAIN,
  };
  res.cookie(ACCESS_COOKIE_NAME, accessToken, { ...cookieOpts, maxAge: 15 * 60 * 1000 });
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, { ...cookieOpts, maxAge: 7 * 24 * 60 * 60 * 1000 });
  issueCsrfCookie(res);
};
export const loginHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, mfaToken } = req.body;
    const result = await authService.login(email, password, mfaToken, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    setAuthCookies(res, result.accessToken, result.refreshToken);
    return sendSuccess(res, { user: result.user });
  } catch (err: any) {
    if (err?.statusCode) return sendError(res, err.statusCode, err.code, err.message);
    next(err);
  }
};

export const refreshHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!refreshToken) return sendError(res, 401, 'UNAUTHENTICATED', 'Missing refresh token');
    const result = await authService.refreshAccessToken(refreshToken);
    setAuthCookies(res, result.accessToken, result.refreshToken);
    return sendSuccess(res, { refreshed: true });
  } catch (err: any) {
    if (err?.statusCode) return sendError(res, err.statusCode, err.code, err.message);
    next(err);
  }
};

export const logoutHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (req.user) await authService.logout(refreshToken, req.user.id);
    res.clearCookie(ACCESS_COOKIE_NAME);
    res.clearCookie(REFRESH_COOKIE_NAME);
    return sendSuccess(res, { loggedOut: true });
  } catch (err) {
    next(err);
  }
};

export const forgotPasswordHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await authService.requestPasswordReset(req.body.email);
    // Always same response — do not reveal account existence.
    return sendSuccess(res, { message: 'If the account exists, a reset link has been sent' });
  } catch (err) {
    next(err);
  }
};

export const resetPasswordHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await authService.resetPassword(req.body.token, req.body.newPassword);
    return sendSuccess(res, { message: 'Password reset successfully' });
  } catch (err: any) {
    if (err?.statusCode) return sendError(res, err.statusCode, err.code, err.message);
    next(err);
  }
};

export const setupMfaHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await authService.setupMfa(req.user!.id);
    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

export const confirmMfaHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await authService.confirmMfa(req.user!.id, req.body.token);
    return sendSuccess(res, { mfaEnabled: true });
  } catch (err: any) {
    if (err?.statusCode) return sendError(res, err.statusCode, err.code, err.message);
    next(err);
  }
};

export const meHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await authService.getMe(req.user!.id);
    return sendSuccess(res, { user });
  } catch (err) {
    next(err);
  }
};