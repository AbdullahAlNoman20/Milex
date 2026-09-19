// server/src/app.ts
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import pino from 'pino';
import { env } from './config/env';
import { prisma } from './config/db';
import { globalApiLimiter, ddosLimiter } from './common/middlewares/rateLimit.middleware';
import { errorHandlerMiddleware, notFoundMiddleware } from './common/middlewares/errorHandler.middleware';

import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import rolesRoutes from './modules/roles-permissions/roles.routes';
import auditLogRoutes from './modules/audit-log/auditLog.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import fileStorageRoutes from './modules/file-storage/fileStorage.routes';
import reportsExportRoutes from './modules/reports-export/reportsExport.routes';
import customersRoutes from './modules/customers/customers.routes';
import serviceProvidersRoutes from './modules/service-providers/serviceProviders.routes';
import onboardingRoutes from './modules/onboarding/onboarding.routes';
import weeklyPlansRoutes from './modules/weekly-plans/weeklyPlans.routes';
import dailyReportsRoutes from './modules/daily-reports/dailyReports.routes';
import followUpsRoutes from './modules/follow-ups/followUps.routes';
import backupRoutes from './modules/backup/backup.routes';
import rateRequestsRoutes from './modules/rate-requests/rateRequests.routes';

export const logger = pino({
  level: env.IS_PRODUCTION ? 'info' : 'debug',
  redact: [
    'req.headers.authorization',
    'req.headers.cookie',
    'res.headers["set-cookie"]',
    'req.body.password',
    'req.body.newPassword',
    'req.body.currentPassword',
    'req.body.token',
  ],
});

export const buildApp = () => {
  const app = express();

  // Correct client IP behind reverse proxies (Render/Vercel/Cloudflare) —
  // without this, rate limiters and login lockout see the proxy's IP for
  // every user instead of the real client IP.
  app.set('trust proxy', 1);

  // Never trust the platform's default X-Powered-By leak.
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"], objectSrc: ["'none'"] } },
      frameguard: { action: 'deny' },
      hsts: { maxAge: 31536000, includeSubDomains: true },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  const allowedOrigins = Array.isArray(env.CORS_ORIGIN) ? env.CORS_ORIGIN : [env.CORS_ORIGIN];

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          logger.warn({ origin }, 'Blocked by CORS');
          callback(null, false);
        }
      },
      credentials: true,
    })
  );

  // Gzip/brotli every JSON response. The customer list alone drops by
  // roughly 85%, which is the single biggest win for slow connections.
  // Already-compressed file downloads are skipped automatically.
  app.use(
    compression({
      threshold: 1024,
      filter: (req, res) => {
        if (req.headers['x-no-compression']) return false;
        return compression.filter(req, res);
      },
    })
  );

  app.use(cookieParser());
  // Global body limit stays small — a 1MB ceiling is plenty for every normal
  // request and keeps oversized-payload floods cheap to reject. The single
  // exception is the backup restore endpoint, which legitimately carries
  // embedded files; it parses its own body with its own limit instead.
  app.use((req, res, next) => {
    if (req.path === '/api/v1/backup/restore') return next();
    return express.json({ limit: '1mb' })(req, res, next);
  });
  app.use(pinoHttp({ logger }));
  app.use(ddosLimiter);
  app.use(globalApiLimiter);

  // Business data must never be cached by a browser or intermediate proxy —
  // otherwise a logged-out user pressing Back can still read the last page.
  app.use('/api/v1', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    next();
  });

  // A health check that never touches the database is worse than none —
  // it reports "ok" while the app is completely unable to serve anything.
  app.get('/health', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return res.status(200).json({ success: true, data: { status: 'ok', database: 'up', uptime: Math.round(process.uptime()) } });
    } catch {
      return res.status(503).json({
        success: false,
        error: { code: 'SERVICE_UNAVAILABLE', message: 'The service is temporarily unavailable. Please try again shortly.' },
      });
    }
  });

  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', usersRoutes);
  app.use('/api/v1/roles', rolesRoutes);
  app.use('/api/v1/audit-log', auditLogRoutes);
  app.use('/api/v1/notifications', notificationsRoutes);
  app.use('/api/v1/files', fileStorageRoutes);
  app.use('/api/v1/reports/export', reportsExportRoutes);
  app.use('/api/v1/customers', customersRoutes);
  app.use('/api/v1/service-providers', serviceProvidersRoutes);
  app.use('/api/v1/onboarding', onboardingRoutes);
  app.use('/api/v1/weekly-plans', weeklyPlansRoutes);
  app.use('/api/v1/daily-reports', dailyReportsRoutes);
  app.use('/api/v1/follow-ups', followUpsRoutes);
  app.use('/api/v1/backup', backupRoutes);
  app.use('/api/v1/rate-requests', rateRequestsRoutes);

  app.use(notFoundMiddleware);
  app.use(errorHandlerMiddleware(logger));

  return app;
};