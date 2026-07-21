// admin/src/Components/services/socketService.js
import { io } from 'socket.io-client';

let socket = null;

export const getSocket = () => {
  if (socket) return socket;
  const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1').replace(/\/api\/v1$/, '');
  socket = io(base, {
    transports: ['websocket', 'polling'],
    withCredentials: true,
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 2000,
  });

  // Temporary visibility — open the browser console and you'll see exactly
  // why a connection succeeds/fails instead of it happening silently.
  socket.on('connect', () => console.info('[socket] connected', socket.id));
  socket.on('connect_error', (err) => console.warn('[socket] connect_error:', err.message));
  socket.on('disconnect', (reason) => console.info('[socket] disconnected:', reason));

  return socket;
};