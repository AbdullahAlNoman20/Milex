// server/src/config/socket.ts
import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { verifyAccessToken } from '../common/utils/jwt.util';
import { env } from './env';

let io: SocketIOServer | null = null;

export const initSocket = (httpServer: HTTPServer) => {
  io = new SocketIOServer(httpServer, {
    cors: { origin: env.CORS_ORIGIN, credentials: true },
    // Allow polling fallback — forcing websocket-only can silently fail the
    // handshake in some dev/network setups with no visible error at all.
    transports: ['websocket', 'polling'],
  });

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

// Called from anywhere a notification-worthy event happens (rate approval,
// field-change request, offer sent, etc.) — pushes instantly to that one
// user's open tabs instead of waiting for the next poll interval. If the
// user isn't connected, this is a no-op; the notification is still in the
// DB and shows up next time they load the bell/page as normal.
export const emitNotificationToUser = (userId: string) => {
  io?.to(`user:${userId}`).emit('notification:new');
};