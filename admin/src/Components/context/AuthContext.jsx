// src/Components/context/AuthContext.jsx — REPLACE ENTIRE FILE
import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { ALL_ROLES } from '../constants/roles';
import { apiLogin, apiFetchMe, setToken, getToken } from '../services/api';

export const AuthContext = createContext(null);

const SESSION_KEY = 'milex_auth_session';
const SESSION_VERSION = 2;

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
    /* storage unavailable — fail silently */
  }
};

const clearSession = () => {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* noop */
  }
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const restore = async () => {
      const restoredUser = readSession();
      const token = getToken();

      if (!restoredUser || !token) {
        clearSession();
        setToken(null);
        setIsInitializing(false);
        return;
      }

      try {
        // Re-validate token against backend on refresh
        const { user } = await apiFetchMe();
        setCurrentUser(user);
        writeSession(user);
      } catch {
        clearSession();
        setToken(null);
        setCurrentUser(null);
      } finally {
        setIsInitializing(false);
      }
    };
    restore();
  }, []);

  const login = useCallback(async (email, password) => {
    if (typeof email !== 'string' || typeof password !== 'string') {
      return { ok: false, error: 'Email and password are required' };
    }
    try {
      const { token, user } = await apiLogin(email.trim(), password);
      if (!token || !user || !ALL_ROLES.includes(user.role)) {
        return { ok: false, error: 'Invalid login response' };
      }
      setToken(token);
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
    setToken(null);
  }, []);

  const value = useMemo(
    () => ({ currentUser, isAuthenticated: !!currentUser, isInitializing, login, logout }),
    [currentUser, isInitializing, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};