// src/Pages/modules/operations/services/operationsAuthService.js
const USERS_SEED_URL = '/data/operationsUsers.json';
let usersCache = null;
const PROFILE_KEY_PREFIX = 'milex_ops_profile_';

const loadUsers = async () => {
  if (usersCache) return usersCache;
  const res = await fetch(USERS_SEED_URL, { credentials: 'same-origin' });
  if (!res.ok) throw new Error('Failed to load operations user directory');
  const data = await res.json();
  usersCache = Array.isArray(data) ? data : [];
  return usersCache;
};

const toPublicUser = (user) => {
  // eslint-disable-next-line no-unused-vars
  const { password, ...publicUser } = user;
  return publicUser;
};

// Per-user overlay (password override + avatar) — layered on top of the
// static seed JSON so profile edits persist across sessions without a
// backend. Keyed by email in localStorage.
const readProfileOverlay = (email) => {
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY_PREFIX + email.toLowerCase());
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const writeProfileOverlay = (email, data) => {
  try {
    window.localStorage.setItem(PROFILE_KEY_PREFIX + email.toLowerCase(), JSON.stringify(data));
  } catch {
    /* storage unavailable — fail silently */
  }
};

export const operationsLogin = async (email, password) => {
  if (typeof email !== 'string' || typeof password !== 'string') {
    throw new Error('Email and password are required');
  }
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) {
    throw new Error('Email and password are required');
  }
  const users = await loadUsers();
  const match = users.find(
    (u) => typeof u.email === 'string' && u.email.toLowerCase() === normalizedEmail
  );
  if (!match) throw new Error('Invalid email or password');
  const overlay = readProfileOverlay(normalizedEmail);
  const effectivePassword = overlay.password || match.password;
  if (password !== effectivePassword) throw new Error('Invalid email or password');
  return { ...toPublicUser(match), avatarDataUrl: overlay.avatarDataUrl || null };
};

export const operationsFetchUsers = async () => {
  const users = await loadUsers();
  return users.map(toPublicUser);
};

export const changeOperationsPassword = async (email, currentPassword, newPassword) => {
  if (typeof email !== 'string' || !email.trim()) throw new Error('Not logged in');
  const users = await loadUsers();
  const match = users.find((u) => typeof u.email === 'string' && u.email.toLowerCase() === email.toLowerCase());
  if (!match) throw new Error('User not found');
  const overlay = readProfileOverlay(email);
  const effectiveCurrent = overlay.password || match.password;
  if (currentPassword !== effectiveCurrent) throw new Error('Current password is incorrect');
  writeProfileOverlay(email, { ...overlay, password: newPassword });
  return true;
};

export const updateOperationsAvatar = async (email, avatarDataUrl) => {
  if (typeof email !== 'string' || !email.trim()) throw new Error('Not logged in');
  const overlay = readProfileOverlay(email);
  writeProfileOverlay(email, { ...overlay, avatarDataUrl });
  return avatarDataUrl;
};