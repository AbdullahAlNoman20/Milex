// src/Pages/modules/operations/context/OperationsAuthContext.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ALL_OPERATIONS_ROLES } from '../constants/operationsRoles';
import { operationsLogin, changeOperationsPassword, updateOperationsAvatar } from '../services/operationsAuthService';
import { OperationsAuthContext } from './OperationsAuthContextObject';

const SESSION_KEY = 'milex_ops_auth_session';
const SESSION_VERSION = 1;

const isValidSessionShape = (obj) =>
  obj &&
  typeof obj === 'object' &&
  obj.version === SESSION_VERSION &&
  obj.user &&
  typeof obj.user.id !== 'undefined' &&
  typeof obj.user.email === 'string' &&
  typeof obj.user.role === 'string' &&
  ALL_OPERATIONS_ROLES.includes(obj.user.role);

// localStorage (not sessionStorage) so a session opened in one tab is also
// visible in tabs opened via target="_blank" (View AWB / Invoice / Label /
// Manifest links) — sessionStorage does not carry over to new tabs.
const readSession = () => {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!isValidSessionShape(parsed)) {
      window.localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return parsed.user;
  } catch {
    window.localStorage.removeItem(SESSION_KEY);
    return null;
  }
};

const writeSession = (user) => {
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify({ version: SESSION_VERSION, user }));
  } catch {
    /* storage unavailable — fail silently */
  }
};

const clearSession = () => {
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    /* noop */
  }
};

export const OperationsAuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentUser(readSession());
    setIsInitializing(false);
  }, []);

  const login = useCallback(async (email, password) => {
    if (typeof email !== 'string' || typeof password !== 'string') {
      return { ok: false, error: 'Email and password are required' };
    }
    try {
      const user = await operationsLogin(email.trim(), password);
      if (!user || !ALL_OPERATIONS_ROLES.includes(user.role)) {
        return { ok: false, error: 'Invalid login response' };
      }
      setCurrentUser(user);
      writeSession(user);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err?.message || 'Login failed' };
    }
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    clearSession();
  }, []);

  const changePassword = useCallback(
    async (currentPassword, newPassword) => {
      if (!currentUser?.email) throw new Error('Not logged in');
      await changeOperationsPassword(currentUser.email, currentPassword, newPassword);
    },
    [currentUser]
  );

  const updateAvatar = useCallback(
    async (avatarDataUrl) => {
      if (!currentUser?.email) throw new Error('Not logged in');
      await updateOperationsAvatar(currentUser.email, avatarDataUrl);
      const updatedUser = { ...currentUser, avatarDataUrl };
      setCurrentUser(updatedUser);
      writeSession(updatedUser);
    },
    [currentUser]
  );

  const value = useMemo(
    () => ({
      currentUser,
      isAuthenticated: !!currentUser,
      isInitializing,
      login,
      logout,
      changePassword,
      updateAvatar,
    }),
    [currentUser, isInitializing, login, logout, changePassword, updateAvatar]
  );

  return <OperationsAuthContext.Provider value={value}>{children}</OperationsAuthContext.Provider>;
};