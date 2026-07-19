// admin/src/Pages/modules/sales/pages/NotificationsPage.jsx 
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { listNotifications, markAllNotificationsRead } from '../../../../Components/services/notificationService';

const NotificationsPage = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const hasMarkedRef = useRef(false);

  useEffect(() => {
    listNotifications(200)
      .then((data) => {
        setItems(data.items || []);
        const unreadIds = (data.items || []).filter((i) => !i.isRead).map((i) => i.id);
        if (!hasMarkedRef.current && unreadIds.length > 0) {
          hasMarkedRef.current = true;
          markAllNotificationsRead(unreadIds).catch(() => {});
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <div className="text-center py-16 text-sm text-slate-400">Loading notifications...</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
      <h2 className="text-2xl font-bold text-slate-800 flex items-center">
        <Bell size={22} className="mr-2 text-slate-400" /> Notifications
      </h2>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 divide-y divide-slate-100">
        {items.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-10">No notifications yet.</p>
        ) : (
          items.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => navigate(n.link)}
              className={`w-full text-left px-5 py-4 text-sm hover:bg-slate-50 transition ${
                n.isOverdue ? 'text-red-600 font-bold' : n.isRead ? 'text-slate-400' : 'text-slate-800 font-semibold'
              }`}
            >
              {n.isOverdue && '⚠ '}{n.label}
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;