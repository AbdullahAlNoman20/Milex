// src/server.ts
import { buildApp, logger } from './app';
import { env } from './config/env';
import { disconnectDb } from './config/db';

const app = buildApp();

const server = app.listen(env.PORT, () => {
  logger.info(`Server listening on port ${env.PORT} [${env.NODE_ENV}]`);
});

const shutdown = async (signal: string) => {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  server.close(async () => {
    await disconnectDb();
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));