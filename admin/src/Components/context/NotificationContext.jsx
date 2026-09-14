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

const REFRESH_INTERVAL_MS = 60000;
const BELL_LIMIT = 8;

// Put a file named notification-ping.mp3 in admin/public/sounds/.
const NOTIFICATION_SOUND_URL = '/sounds/notification-ping.mp3';

let sharedAudio = null;
const playNotificationSound = () => {
  try {
    if (!sharedAudio) sharedAudio = new Audio(NOTIFICATION_SOUND_URL);
    sharedAudio.currentTime = 0;
    sharedAudio.play().catch(() => {});
  } catch {
    /* ignore autoplay restrictions */
  }
};

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
    // The server now writes the notification row BEFORE pushing, and sends
    // the body along with the push. So we can render it instantly from the
    // payload, then reconcile with the server in the background — no waiting
    // on a network round-trip, and no more "sound played but bell is empty".
    const handleNew = (payload) => {
      playNotificationSound();
      if (payload && payload.label) {
        setItems((prev) => {
          if (prev.some((i) => i.label === payload.label && i.link === payload.link && !i.isRead)) return prev;
          return [
            {
              id: `live_${payload.createdAt}_${payload.link}`,
              label: payload.label,
              link: payload.link,
              isOverdue: !!payload.isOverdue,
              isRead: false,
              createdAt: payload.createdAt,
            },
            ...prev,
          ].slice(0, BELL_LIMIT);
        });
        setCount((prev) => prev + 1);
      }
      refresh();
    };
    socket.on('notification:new', handleNew);

    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(id);
      socket.off('notification:new', handleNew);
      window.removeEventListener("focus", refresh);
    };
  }, [refresh]);

  // Fixed: the previous version computed the new unread count using a
  // stale `items` closure captured at hook-creation time, and depended on
  // `items` in its own dependency array (recreating the function on every
  // change, defeating the purpose). This version computes the count
  // change as a side effect of the setItems updater itself, which React
  // runs synchronously, so it's always correct and needs no dependencies.
  const markReadLocally = useCallback((ids) => {
    const idSet = new Set(ids);
    let unreadMarkedCount = 0;
    setItems((prev) =>
      prev.map((i) => {
        if (idSet.has(i.id) && !i.isRead) {
          unreadMarkedCount += 1;
          return { ...i, isRead: true };
        }
        return i;
      })
    );
    setCount((prev) => Math.max(0, prev - unreadMarkedCount));
  }, []);

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