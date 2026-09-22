// src/Pages/modules/operations/components/NotificationBell.jsx
import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useOperationsAuth } from '../hooks/useOperationsAuth';
import { usePendingTasks } from '../hooks/usePendingTasks';
import { useClientNotifications } from '../hooks/useClientNotifications';
import { OPERATIONS_ROLES } from '../constants/operationsRoles';

const NOTIFICATIONS_PATH_BY_ROLE = Object.freeze({
  [OPERATIONS_ROLES.CLIENT]: '/operations/client/notifications',
  [OPERATIONS_ROLES.OPERATIONS_HEAD]: '/operations/head/notifications',
  [OPERATIONS_ROLES.DOMESTIC_ADMIN]: '/operations/domestic/notifications',
  [OPERATIONS_ROLES.FOREIGN_ADMIN]: '/operations/foreign/notifications',
});

const NotificationBell = () => {
  const { currentUser } = useOperationsAuth();
  const isClient = currentUser?.role === OPERATIONS_ROLES.CLIENT;
  const pendingTasks = usePendingTasks();
  const clientNotifications = useClientNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const items = isClient
    ? clientNotifications.requests
        .filter((r) => r.headMessage)
        .slice(0, 6)
        .map((r) => ({ key: r.id, text: r.headMessage, sub: `${r.mode} — ${r.party?.companyName || ''}`, unread: !r.headMessageRead }))
    : [
        ...pendingTasks.requestTasks.slice(0, 3).map((r) => ({
          key: `req-${r.id}`,
          text: `${r.mode} request awaiting approval`,
          sub: r.party?.companyName || r.clientEmail,
          unread: true,
        })),
        ...pendingTasks.shipmentTasks.slice(0, 5).map((s) => ({
          key: `sh-${s.id}`,
          text: `${s.awbNumber} needs your action`,
          sub: s.statusLabel,
          unread: true,
        })),
      ].slice(0, 6);

  const count = isClient ? clientNotifications.unreadCount : pendingTasks.totalCount;
  const viewAllPath = NOTIFICATIONS_PATH_BY_ROLE[currentUser?.role];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        className="relative w-9 h-9 rounded-full bg-slate-50 text-slate-500 flex items-center justify-center hover:bg-slate-100 transition"
      >
        <Bell size={16} />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-red-600 text-white text-[9px] font-bold flex items-center justify-center">
            {count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-black text-slate-800">Notifications</p>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="text-xs text-slate-400 p-4 text-center">No notifications right now.</p>
            ) : (
              items.map((item) => (
                <div key={item.key} className="px-4 py-3 border-b border-slate-50 last:border-b-0">
                  <p className={`text-xs font-bold ${item.unread ? 'text-slate-800' : 'text-slate-400'}`}>{item.text}</p>
                  {item.sub && <p className="text-[10px] text-slate-400 mt-0.5">{item.sub}</p>}
                </div>
              ))
            )}
          </div>
          {viewAllPath && (
            <Link
              to={viewAllPath}
              onClick={() => setOpen(false)}
              className="block text-center text-xs font-bold text-emerald-600 py-2.5 border-t border-slate-100 hover:bg-slate-50 transition"
            >
              View All
            </Link>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;