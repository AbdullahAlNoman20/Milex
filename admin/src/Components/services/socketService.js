// admin/src/Components/services/socketService.js
import { io } from 'socket.io-client';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

let socket = null;
let isRefreshing = false;

// The socket handshake authenticates with the httpOnly access_token cookie,
// which lives for 15 minutes. Once it expired, every reconnect attempt was
// rejected and after 10 tries the socket gave up permanently — the person
// then received no live notifications at all until they reloaded the page.
// On an auth failure we now silently renew the cookie (the 7-day refresh
// token is still valid) and let socket.io retry, so a session stays live all
// day with no extra polling and no extra load.
const refreshSession = async () => {
  if (isRefreshing) return;
  isRefreshing = true;
  try {
    const csrfToken = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/)?.[1];
    await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: csrfToken ? { 'x-csrf-token': decodeURIComponent(csrfToken) } : {},
    });
  } catch {
    /* offline or server unreachable — socket.io's own backoff handles it */
  } finally {
    isRefreshing = false;
  }
};

export const getSocket = () => {
  if (socket) return socket;
  const base = API_BASE.replace(/\/api\/v1$/, '');
  socket = io(base, {
    transports: ['websocket', 'polling'],
    withCredentials: true,
    autoConnect: true,
    reconnection: true,
    // Never permanently give up: the backoff below caps retries at one every
    // 15s, which is negligible load, and guarantees the person is reconnected
    // the moment the network or server comes back.
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 15000,
    randomizationFactor: 0.5,
    timeout: 20000,
  });

  socket.on('connect_error', (err) => {
    if (/unauth/i.test(err?.message || '')) {
      refreshSession();
    }
  });

  return socket;
};

export const disconnectSocket = () => {
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
};