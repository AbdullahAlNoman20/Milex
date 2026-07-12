// src/common/utils/jwt.util.ts
import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env';

export interface AccessTokenPayload {
  sub: string;
  role: string;
  permissions: string[];
}

export const signAccessToken = (payload: AccessTokenPayload): string =>
  jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES_IN } as SignOptions);

export const verifyAccessToken = (token: string): AccessTokenPayload =>
  jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;

export const signRefreshToken = (sub: string): string =>
  jwt.sign({ sub }, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN } as SignOptions);

export const verifyRefreshToken = (token: string): { sub: string } =>
  jwt.verify(token, env.JWT_REFRESH_SECRET) as { sub: string };