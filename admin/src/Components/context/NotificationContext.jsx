// admin/src/Components/context/NotificationContext.jsx
import React, {
  createContext,
  useMemo,
  useState,
  useEffect,
  useCallback,
} from "react";
import { request } from "../services/api";

export const NotificationContext = createContext(null);

const REFRESH_INTERVAL_MS = 15000;

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const refresh = useCallback(async () => {
    try {
      const { data } = await request("/notifications");
      setNotifications(Array.isArray(data.items) ? data.items : []);
    } catch {
      setNotifications([]);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, REFRESH_INTERVAL_MS);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", refresh);
    };
  }, [refresh]);

  const value = useMemo(
    () => ({ notifications, count: notifications.length, refresh }),
    [notifications, refresh],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
