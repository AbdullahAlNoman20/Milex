// src/Components/services/api.js
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
const REQUEST_TIMEOUT_MS = 10000;
const TOKEN_KEY = 'milex_token';

export const getToken = () => {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setToken = (token) => {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable */
  }
};

const STATE_CHANGING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

const getCsrfToken = () => {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
};

export const request = async (path, { method = 'GET', body, headers = {}, _retried = false } = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const token = getToken();
  const csrfToken = STATE_CHANGING_METHODS.includes(method) ? getCsrfToken() : null;

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      signal: controller.signal,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const contentType = res.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await res.json() : null;

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
      const message = data?.error?.message || `Request failed with status ${res.status}`;
      throw new Error(message);
    }
    return data;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const apiLogin = (email, password) => request('/auth/login', { method: 'POST', body: { email, password } });

export const apiFetchMe = () => request('/auth/me');