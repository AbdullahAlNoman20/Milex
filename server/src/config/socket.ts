// server/src/config/socket.ts — FULL REPLACE
import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { verifyAccessToken } from '../common/utils/jwt.util';
import { env } from './env';

let io: SocketIOServer | null = null;

// Redis adapter is only needed once this app runs as MULTIPLE processes
// (PM2 cluster mode / multiple servers) — with the current single-instance
// fork-mode deployment, the default in-memory adapter already works
// correctly. This stays fully optional: if REDIS_URL isn't set, Socket.IO
// simply runs in its normal single-process mode, exactly as before. Setting
// REDIS_URL later (when actually scaling to multiple instances) turns this
// on with no other code changes needed.
export const initSocket = async (httpServer: HTTPServer) => {
  io = new SocketIOServer(httpServer, {
    cors: { origin: env.CORS_ORIGIN, credentials: true },
    // Allow polling fallback — forcing websocket-only can silently fail the
    // handshake in some dev/network setups with no visible error at all.
    transports: ['websocket', 'polling'],
    pingInterval: 25000,
    pingTimeout: 60000,
  });

  if (env.REDIS_URL) {
    try {
      const pubClient = createClient({ url: env.REDIS_URL });
      const subClient = pubClient.duplicate();
      pubClient.on('error', (err) => console.error('[socket] Redis pub client error:', err.message));
      subClient.on('error', (err) => console.error('[socket] Redis sub client error:', err.message));
      await pubClient.connect();
      await subClient.connect();
      io.adapter(createAdapter(pubClient, subClient));
      console.info('[socket] Redis adapter enabled — multi-instance broadcasting is active.');
    } catch (err) {
      console.error(
        '[socket] Failed to connect to Redis for the Socket.IO adapter. Falling back to single-instance mode:',
        (err as Error)?.message,
      );
    }
  }

  io.use((socket, next) => {
    try {
      const cookies = socket.handshake.headers.cookie || '';
      const match = cookies.match(/(?:^|;\s*)access_token=([^;]+)/);
      const token = match ? decodeURIComponent(match[1]) : null;
      if (!token) {
        console.warn('[socket] rejected: no access_token cookie present');
        return next(new Error('Unauthenticated'));
      }
      const payload = verifyAccessToken(token);
      (socket as any).userId = payload.sub;
      next();
    } catch (err) {
      console.warn('[socket] rejected: invalid/expired access token —', (err as Error)?.message);
      next(new Error('Unauthenticated'));
    }
  });

  io.on('connection', (socket) => {
    const userId = (socket as any).userId;
    if (userId) {
      socket.join(`user:${userId}`);
      console.info(`[socket] user ${userId} connected (${socket.id})`);
    }
    socket.on('disconnect', () => {
      console.info(`[socket] user ${userId || 'unknown'} disconnected (${socket.id})`);
    });
  });

  return io;
};

export const emitNotificationToUser = (userId: string) => {
  io?.to(`user:${userId}`).emit('notification:new');
};