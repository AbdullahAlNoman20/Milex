// server/src/server.ts — FULL REPLACE
import { buildApp, logger } from './app';
import { env } from './config/env';
import { disconnectDb } from './config/db';
import { initSocket } from './config/socket';
import { startScheduledJobs } from './jobs/scheduler';

const main = async () => {
  const app = buildApp();

  const server = app.listen(env.PORT, () => {
    logger.info(`Server listening on port ${env.PORT} [${env.NODE_ENV}]`);
  });

  await initSocket(server);
  startScheduledJobs();

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    server.close(async () => {
      await disconnectDb();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

main().catch((err) => {
  logger.error({ err }, 'Fatal error during server startup');
  process.exit(1);
});