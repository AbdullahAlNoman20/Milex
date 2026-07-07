// src/Components/context/AuthContext.jsx
import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { ALL_ROLES } from '../constants/roles';

export const AuthContext = createContext(null);

const SESSION_KEY = 'milex_auth_session';
const SESSION_VERSION = 1;

const isValidSessionShape = (obj) =>
  obj &&
  typeof obj === 'object' &&
  obj.version === SESSION_VERSION &&
  obj.user &&
  typeof obj.user.id !== 'undefined' &&
  typeof obj.user.email === 'string' &&
  typeof obj.user.role === 'string' &&
  ALL_ROLES.includes(obj.user.role);

const readSession = () => {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!isValidSessionShape(parsed)) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return parsed.user;
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
};

const writeSession = (user) => {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ version: SESSION_VERSION, user }));
  } catch {
    /* storage unavailable (private mode / quota) — fail silently, memory state still works */
  }
};

const clearSession = () => {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* noop */
  }
};

const sanitizeUserForState = (rawUser) => {
  if (!rawUser || typeof rawUser !== 'object') return null;
  const { password, ...safeUser } = rawUser;
  return safeUser;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const restored = readSession();
    if (restored) setCurrentUser(restored);
    setIsInitializing(false);
  }, []);

  const login = useCallback((userRecord) => {
    const safeUser = sanitizeUserForState(userRecord);
    if (!safeUser) return false;
    setCurrentUser(safeUser);
    writeSession(safeUser);
    return true;
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    clearSession();
  }, []);

  const value = useMemo(
    () => ({ currentUser, isAuthenticated: !!currentUser, isInitializing, login, logout }),
    [currentUser, isInitializing, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};