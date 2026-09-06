// admin/src/Components/context/NotificationContext.jsx — FULL REPLACE
import React, {
  createContext,
  useMemo,
  useState,
  useEffect,
  useCallback,
} from "react";
import { listNotifications } from "../services/notificationService";
import { getSocket } from "../services/socketService";

export const NotificationContext = createContext(null);

const REFRESH_INTERVAL_MS = 60000; // fallback poll only — socket handles instant updates
const BELL_LIMIT = 8;

export const NotificationProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const data = await listNotifications(BELL_LIMIT);
      setItems(data.items || []);
      setCount(data.count || 0);
    } catch {
      /* keep last known state on transient fetch failure */
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, REFRESH_INTERVAL_MS);

    const socket = getSocket();
    const handleNew = () => refresh();
    socket.on('notification:new', handleNew);

    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(id);
      socket.off('notification:new', handleNew);
      window.removeEventListener("focus", refresh);
    };
  }, [refresh]);

  // Optimistic local update so the bell's unread count drops immediately
  // when something is marked read from anywhere in the app (the bell
  // dropdown itself, or the full Notifications page), instead of waiting
  // up to 60s for the next poll.
  const markReadLocally = useCallback((ids) => {
    const idSet = new Set(ids);
    setItems((prev) => prev.map((i) => (idSet.has(i.id) ? { ...i, isRead: true } : i)));
    setCount((prev) => Math.max(0, prev - ids.filter((id) => {
      const item = items.find((i) => i.id === id);
      return item && !item.isRead;
    }).length));
  }, [items]);

  const value = useMemo(
    () => ({ items, count, refresh, markReadLocally }),
    [items, count, refresh, markReadLocally],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};