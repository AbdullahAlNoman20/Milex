// src/Components/context/AuthContext.jsx — REPLACE ENTIRE FILE
import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { ALL_ROLES } from '../constants/roles';
import { apiLogin, apiFetchMe } from '../services/api';

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
      // No storage gate here — always ask the backend, since the httpOnly
      // refresh cookie (valid 7 days) is the real source of truth, and
      // request() will silently refresh an expired access token for us.
      try {
        const { data } = await apiFetchMe();
        setCurrentUser(data.user);
        writeSession(data.user);
      } catch {
        clearSession();
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
      // Auth token lives in an httpOnly cookie set by the backend — never in
      // the JSON body, so we don't check for or store a token here at all.
      const { data } = await apiLogin(email.trim(), password);
      const { user } = data;
      if (!user || !ALL_ROLES.includes(user.role)) {
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

  const value = useMemo(
    () => ({ currentUser, isAuthenticated: !!currentUser, isInitializing, login, logout }),
    [currentUser, isInitializing, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};