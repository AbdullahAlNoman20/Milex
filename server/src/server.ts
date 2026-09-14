// server/src/server.ts
import { buildApp, logger } from './app';
import { env } from './config/env';
import { disconnectDb } from './config/db';
import { initSocket, closeSocket } from './config/socket';
import { startScheduledJobs } from './jobs/scheduler';

const SHUTDOWN_TIMEOUT_MS = 15000;

const main = async () => {
  const app = buildApp();

  const server = app.listen(env.PORT, () => {
    logger.info(`Server listening on port ${env.PORT} [${env.NODE_ENV}]`);
  });

  await initSocket(server);
  startScheduledJobs();

  let isShuttingDown = false;

  const shutdown = async (signal: string, exitCode = 0) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info(`Received ${signal}, shutting down gracefully...`);

    // Hard ceiling: if anything hangs (an open websocket, a stuck query),
    // exit anyway rather than letting the process manager SIGKILL us
    // mid-write. Previously server.close() waited forever because the
    // socket.io connections were never closed, so this never completed.
    const forceExit = setTimeout(() => {
      logger.error('Graceful shutdown timed out — forcing exit.');
      process.exit(exitCode || 1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceExit.unref();

    try {
      await closeSocket();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await disconnectDb();
    } catch (err) {
      logger.error({ err }, 'Error during shutdown');
    } finally {
      clearTimeout(forceExit);
      process.exit(exitCode);
    }
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  // Node terminates the process on an unhandled rejection by default, which
  // would drop every in-flight request without warning and wipe the
  // in-memory rate-limit and permission caches. Log it, keep serving, and
  // only shut down for a genuinely unrecoverable uncaught exception.
  process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason }, 'Unhandled promise rejection (request continues, please investigate)');
  });

  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception — restarting after draining connections');
    void shutdown('uncaughtException', 1);
  });
};

main().catch((err) => {
  logger.error({ err }, 'Fatal error during server startup');
  process.exit(1);
});