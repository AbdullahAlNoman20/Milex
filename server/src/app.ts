// src/app.ts
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import pino from 'pino';
import { env } from './config/env';
import { globalApiLimiter } from './common/middlewares/rateLimit.middleware';
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

export const logger = pino({ level: env.IS_PRODUCTION ? 'info' : 'debug', redact: ['req.headers.authorization', 'req.headers.cookie'] });

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

  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));
  app.use(pinoHttp({ logger }));
  app.use(globalApiLimiter);

  app.get('/health', (_req, res) => res.status(200).json({ success: true, data: { status: 'ok' } }));

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

  app.use(notFoundMiddleware);
  app.use(errorHandlerMiddleware(logger));

  return app;
};