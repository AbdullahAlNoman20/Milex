// server/src/config/env.ts — REPLACE ENTIRE FILE
import dotenv from 'dotenv';
import path from 'path';

// Single .env file for everything. The Prisma CLI only ever reads `.env`
// (never `.env.development` / `.env.production`), so keeping one file means
// `npx prisma migrate dev` and `npm run dev` always see identical values —
// no more "works with .env but not .env.development" mismatch. On Render
// (or any host that injects env vars directly into process.env) there is no
// `.env` file at all — dotenv silently no-ops in that case, so this same
// code works unchanged in production.
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const required = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export const env = Object.freeze({
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 5000),
  DATABASE_URL: required('DATABASE_URL'),
  DIRECT_URL: required('DIRECT_URL'),
  R2_ENDPOINT: process.env.R2_ENDPOINT || '',
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID || '',
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY || '',
  R2_BUCKET: process.env.R2_BUCKET || '',
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  SUPABASE_BUCKET: process.env.SUPABASE_BUCKET || 'onboarding-documents',
  JWT_ACCESS_SECRET: required('JWT_ACCESS_SECRET'),
  JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET'),
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  FIELD_ENCRYPTION_KEY: required('FIELD_ENCRYPTION_KEY'),
  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN || 'localhost',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
});

if (env.IS_PRODUCTION && (env.JWT_ACCESS_SECRET.length < 32 || env.JWT_REFRESH_SECRET.length < 32)) {
  throw new Error('JWT secrets must be at least 256 bits (32 chars) in production');
}