// src/Components/context/AuthContext.jsx
import { useState, useEffect, useCallback, useMemo } from "react";
import { ALL_ROLES } from "../constants/roles";
import { apiLogin, apiFetchMe, apiLogout } from "../services/api";
import { disconnectSocket } from "../services/socketService";
import { AuthContext } from "./AuthContextObject";

const SESSION_KEY = "milex_auth_session";
const SESSION_VERSION = 2;



const writeSession = (user) => {
  try {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ version: SESSION_VERSION, user }),
    );
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
    if (typeof email !== "string" || typeof password !== "string") {
      return { ok: false, error: "Email and password are required" };
    }
    try {
      // Auth token lives in an httpOnly cookie set by the backend — never in
      // the JSON body, so we don't check for or store a token here at all.
      const { data } = await apiLogin(email.trim(), password);
      const { user } = data;
      if (!user || !ALL_ROLES.includes(user.role)) {
        return { ok: false, error: "Invalid login response" };
      }
      setCurrentUser(user);
      writeSession(user);
      // The role is handed back so the caller can route without waiting for
      // the context's own state update to land.
      return { ok: true, user };
    } catch (err) {
      return { ok: false, error: err?.message || "Login failed" };
    }
  }, []);

  const logout = useCallback(async () => {
    // Must actually invalidate the httpOnly access/refresh cookies on the
    // server — clearing only client state left them valid, so the next
    // page load's silent apiFetchMe() call would restore the session and
    // land right back on the dashboard, making Logout look broken.
    try {
      await apiLogout();
    } catch {
      /* proceed to clear client state regardless of server call outcome */
    }
    // The socket authenticates once at handshake time and then stays open.
    // Without closing it here, the previous person's live connection would
    // survive a logout and keep delivering their notifications to whoever
    // signs in next on the same browser tab.
    disconnectSocket();
    setCurrentUser(null);
    clearSession();
  }, []);

  const value = useMemo(
    () => ({
      currentUser,
      isAuthenticated: !!currentUser,
      isInitializing,
      login,
      logout,
    }),
    [currentUser, isInitializing, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
