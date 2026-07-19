// admin/src/Components/Shared/NotificationBell.jsx
import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { listNotifications, markNotificationRead } from '../services/notificationService';

const REFRESH_MS = 15000;
const BELL_LIMIT = 8;

const NotificationBell = () => {
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  const refresh = useCallback(() => {
    listNotifications(BELL_LIMIT)
      .then((data) => {
        setItems(data.items || []);
        setCount(data.count || 0);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = async (n) => {
    setOpen(false);
    if (!n.isRead) {
      setItems((prev) => prev.map((i) => (i.id === n.id ? { ...i, isRead: true } : i)));
      setCount((c) => Math.max(0, c - 1));
      markNotificationRead(n.id).catch(() => {});
    }
    navigate(n.link);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen((o) => !o)}
        className="relative w-9 h-9 rounded-full bg-slate-50 text-slate-500 flex items-center justify-center hover:bg-slate-100 transition"
      >
        <Bell size={16} />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-3 w-72 bg-white border border-slate-200 rounded-lg shadow-xl py-2 z-50 max-h-80 overflow-y-auto">
          <div className="px-4 py-2 border-b border-slate-100 font-bold text-slate-800 text-sm">Notifications</div>
          {items.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-slate-500">No new notifications.</div>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => handleSelect(n)}
                className={`w-full text-left px-4 py-2.5 text-xs hover:bg-slate-50 transition border-b border-slate-50 last:border-0 ${
                  n.isOverdue ? 'text-red-600 font-bold' : n.isRead ? 'text-slate-400' : 'text-slate-800 font-semibold'
                }`}
              >
                {n.isOverdue && '⚠ '}{n.label}
              </button>
            ))
          )}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate('/app/notifications');
            }}
            className="w-full text-center px-4 py-2.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 transition"
          >
            View All
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;