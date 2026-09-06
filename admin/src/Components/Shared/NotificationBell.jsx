// admin/src/Components/Shared/NotificationBell.jsx — FULL REPLACE
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { markNotificationRead } from '../services/notificationService';
import { useNotifications } from '../hooks/useNotifications';

// Put a file named notification-ping.mp3 in admin/public/sounds/ — a short
// (under 1 second) soft "ping"/"pop" style sound works best; avoid long or
// loud clips since this can fire during active work.
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

const NotificationBell = () => {
  const { items, count, refresh, markReadLocally } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  // Starts at null (not the current count) so the very first successful
  // load — right after logging in — never plays a sound just for showing
  // whatever unread notifications already existed. Sound only plays when
  // the count genuinely increases after that first known value.
  const prevCountRef = useRef(null);

  useEffect(() => {
    if (prevCountRef.current !== null && count > prevCountRef.current) {
      playNotificationSound();
    }
    prevCountRef.current = count;
  }, [count]);

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
      markReadLocally([n.id]);
      markNotificationRead(n.id).catch(() => refresh());
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