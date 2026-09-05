// src/Components/services/api.js
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
const REQUEST_TIMEOUT_MS = 10000;

const STATE_CHANGING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

const getCsrfToken = () => {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
};

export const request = async (path, { method = 'GET', body, headers = {}, _retried = false } = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const csrfToken = STATE_CHANGING_METHODS.includes(method) ? getCsrfToken() : null;

  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      signal: controller.signal,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    clearTimeout(timeoutId);
    // Translate raw browser/network failures (fetch throwing "Failed to
    // fetch", or AbortController firing on timeout) into plain language —
    // a normal person shouldn't see "AbortError" or "TypeError". The
    // original error is kept as `cause` so it's still visible in dev tools/
    // logs for debugging, without being shown to the user.
    if (networkErr?.name === 'AbortError') {
      throw new Error('This is taking longer than expected. Please check your connection and try again.', { cause: networkErr });
    }
    throw new Error('We couldn\'t reach the server. Please check your internet connection and try again.', { cause: networkErr });
  }

  try {
    let data = null;
    try {
      const contentType = res.headers.get('content-type') || '';
      data = contentType.includes('application/json') ? await res.json() : null;
    } catch {
      // Response wasn't valid JSON (e.g. server returned an HTML error page) —
      // don't let a JSON.parse crash surface as a raw error to the user.
      data = null;
    }

    if (!res.ok) {
      const isAuthExpiry = res.status === 401 && data?.error?.code === 'UNAUTHENTICATED';
      const canRetry = isAuthExpiry && !_retried && path !== '/auth/refresh' && path !== '/auth/login';
      if (canRetry) {
        try {
          await request('/auth/refresh', { method: 'POST', _retried: true });
          return request(path, { method, body, headers, _retried: true });
        } catch {
          /* refresh failed — fall through to original error */
        }
      }
      const message = data?.error?.message || 'Something went wrong on our end. Please try again in a moment.';
      throw new Error(message);
    }
    return data;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const apiLogin = (email, password) => request('/auth/login', { method: 'POST', body: { email, password } });

export const apiFetchMe = () => request('/auth/me');

export const apiLogout = () => request('/auth/logout', { method: 'POST' });