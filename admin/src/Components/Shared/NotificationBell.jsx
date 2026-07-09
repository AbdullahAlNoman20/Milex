// src/Components/Shared/NotificationBell.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';

const NotificationBell = () => {
  const { notifications, count } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
          {notifications.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-slate-500">No new notifications.</div>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => {
                  setOpen(false);
                  navigate(n.link);
                }}
                className="w-full text-left px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition border-b border-slate-50 last:border-0"
              >
                {n.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;