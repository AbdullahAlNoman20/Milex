// server/src/config/env.ts
import dotenv from "dotenv";
import path from "path";

// Single .env file for everything. The Prisma CLI only ever reads `.env`
// (never `.env.development` / `.env.production`), so keeping one file means
// `npx prisma migrate dev` and `npm run dev` always see identical values —
// no more "works with .env but not .env.development" mismatch. On Render
// (or any host that injects env vars directly into process.env) there is no
// `.env` file at all — dotenv silently no-ops in that case, so this same
// code works unchanged in production.
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const required = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export const env = Object.freeze({
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT || 5000),
  DATABASE_URL: required("DATABASE_URL"),
  DIRECT_URL: required("DIRECT_URL"),
  UPLOAD_DIR: process.env.UPLOAD_DIR || "/home/deploy/uploads",
  JWT_ACCESS_SECRET: required("JWT_ACCESS_SECRET"),
  JWT_REFRESH_SECRET: required("JWT_REFRESH_SECRET"),
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  CORS_ORIGIN: (process.env.CORS_ORIGIN || "http://localhost:5173")
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean),
  FIELD_ENCRYPTION_KEY: required("FIELD_ENCRYPTION_KEY"),
  // Separate secret for signing short-lived file download links. Falls back
  // to the JWT secret so existing deployments keep working unchanged.
  FILE_SIGNING_SECRET: process.env.FILE_SIGNING_SECRET || required("JWT_ACCESS_SECRET"),
  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN || "localhost",
  IS_PRODUCTION: process.env.NODE_ENV === "production",
  // Optional — only needed if/when this app scales to multiple PM2
  // instances or multiple servers. Leave unset for the current
  // single-instance deployment; Socket.IO works fine without it.
  REDIS_URL: process.env.REDIS_URL || "",
  // Postgres connection pool size used by the pg.Pool driver adapter (see
  // config/db.ts). NOTE: this is NOT the same as a `connection_limit` query
  // param on DATABASE_URL — that param only affects Prisma's own built-in
  // pooling, which this app does not use (it uses a custom pg Pool adapter
  // instead), so it would silently do nothing here. This is the setting
  // that actually matters. Before raising it, check your Postgres server's
  // own limit with `SHOW max_connections;` — this value plus every other
  // app/tool connecting to the same database must stay comfortably under it.
  // Raised from 10: with ~60 concurrent staff, 10 connections became the
  // queueing bottleneck long before Postgres itself did. Check your server's
  // `SHOW max_connections;` and keep this plus every other client under it.
  PG_POOL_MAX: Number(process.env.PG_POOL_MAX || 20),
  // Optional ClamAV daemon (clamd) for real virus scanning of uploads.
  // Leave CLAMAV_HOST unset to keep the current behaviour (extension +
  // magic-byte validation only). Setting it turns on real scanning with no
  // other code change anywhere.
  CLAMAV_HOST: process.env.CLAMAV_HOST || '',
  CLAMAV_PORT: Number(process.env.CLAMAV_PORT || 3310),
  CLAMAV_TIMEOUT_MS: Number(process.env.CLAMAV_TIMEOUT_MS || 20000),
});

if (
  env.IS_PRODUCTION &&
  (env.JWT_ACCESS_SECRET.length < 32 || env.JWT_REFRESH_SECRET.length < 32)
) {
  throw new Error(
    "JWT secrets must be at least 256 bits (32 chars) in production",
  );
}
