// admin/src/Pages/modules/sales/pages/NotificationsPage.jsx
import { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, RefreshCw, CheckCheck, ExternalLink, AlertTriangle } from 'lucide-react';
import { listNotifications, markAllNotificationsRead } from '../../../../Components/services/notificationService';

const Donut = ({ segments, size = 84, thickness = 14 }) => {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const stops = segments
    .reduce((acc, seg) => {
      const prevEnd = acc.length ? acc[acc.length - 1].end : 0;
      const start = (prevEnd / total) * 360;
      const end = ((prevEnd + seg.value) / total) * 360;
      acc.push({ color: seg.color, start, end });
      return acc;
    }, [])
    .map((s) => `${s.color} ${s.start}deg ${s.end}deg`)
    .join(', ');
  return (
    <div className="rounded-full shrink-0" style={{ width: size, height: size, background: `conic-gradient(${stops})` }}>
      <div className="rounded-full bg-white" style={{ width: size - thickness * 2, height: size - thickness * 2, margin: thickness }} />
    </div>
  );
};

const KpiCard = ({ icon: Icon, label, value, iconBg }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex items-center gap-3 min-w-0">
    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
      <Icon size={18} />
    </div>
    <div className="min-w-0">
      <p className="text-[11px] font-semibold text-slate-500 truncate">{label}</p>
      <p className="text-xl font-bold text-slate-800 leading-tight">{value}</p>
    </div>
  </div>
);

const NotificationsPage = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const hasMarkedRef = useRef(false);

  const load = () => {
    setIsLoading(true);
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
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();

  }, []);

  const handleMarkAll = () => {
    const unreadIds = items.filter((i) => !i.isRead).map((i) => i.id);
    if (unreadIds.length === 0) return;
    setItems((prev) => prev.map((i) => ({ ...i, isRead: true })));
    markAllNotificationsRead(unreadIds).catch(() => {});
  };

  const totalCount = items.length;
  const unreadCount = items.filter((i) => !i.isRead).length;
  const overdueCount = items.filter((i) => i.isOverdue).length;
  const readCount = totalCount - unreadCount;

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((n) => {
      const matchesSearch = !q || n.label?.toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'unread' && !n.isRead) ||
        (statusFilter === 'read' && n.isRead) ||
        (statusFilter === 'overdue' && n.isOverdue);
      return matchesSearch && matchesStatus;
    });
  }, [items, search, statusFilter]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-slate-400">Loading notifications...</div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[1440px] mx-auto px-3 sm:px-6 py-5 sm:py-6 space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Bell size={22} className="text-slate-400" /> Notification Center
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">Manage all system alerts, approvals, reminders and updates.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                maxLength={150}
                placeholder="Search notifications..."
                className="pl-7 pr-2 py-2.5 w-44 sm:w-56 rounded-lg border border-slate-200 text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <button
              type="button"
              onClick={load}
              aria-label="Refresh"
              className="inline-flex items-center justify-center text-slate-600 border border-slate-200 bg-white w-9 h-9 rounded-lg hover:bg-slate-50 transition"
            >
              <RefreshCw size={14} />
            </button>
            <button
              type="button"
              onClick={handleMarkAll}
              disabled={unreadCount === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-emerald-800 transition disabled:opacity-50"
            >
              <CheckCheck size={14} /> Mark All as Read
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KpiCard icon={Bell} label="Total Notifications" value={totalCount} iconBg="bg-emerald-50 text-emerald-600" />
          <KpiCard icon={Bell} label="Unread Notifications" value={unreadCount} iconBg="bg-amber-50 text-amber-600" />
          <KpiCard icon={AlertTriangle} label="Overdue Notifications" value={overdueCount} iconBg="bg-red-50 text-red-600" />
          <KpiCard icon={CheckCheck} label="Read Notifications" value={readCount} iconBg="bg-blue-50 text-blue-600" />
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8 space-y-4 min-w-0">
            {/* Filters */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-3 sm:p-4 flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 mr-1 shrink-0">Status:</span>
              {[
                { key: 'all', label: 'All' },
                { key: 'unread', label: 'Unread' },
                { key: 'read', label: 'Read' },
                { key: 'overdue', label: 'Overdue' },
              ].map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setStatusFilter(f.key)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition ${
                    statusFilter === f.key
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              {filteredItems.length === 0 ? (
                <p className="text-xs text-slate-400 px-5 py-10 text-center">No notifications match your filters.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredItems.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => navigate(n.link)}
                      className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 text-left hover:bg-emerald-50/30 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            n.isOverdue ? 'bg-red-500' : !n.isRead ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                        />
                        <span
                          className={`text-sm truncate ${
                            n.isOverdue ? 'text-red-600 font-bold' : n.isRead ? 'text-slate-400' : 'text-slate-800 font-semibold'
                          }`}
                        >
                          {n.isOverdue && '⚠ '}
                          {n.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            n.isRead ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {n.isRead ? 'Read' : 'Unread'}
                        </span>
                        <ExternalLink size={13} className="text-slate-300" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right sidebar */}
          <div className="lg:col-span-4 space-y-5 min-w-0">
            <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-4">
              <h3 className="font-bold text-slate-800 text-sm mb-3">Read vs Unread</h3>
              {totalCount === 0 ? (
                <p className="text-xs text-slate-400">No notifications yet.</p>
              ) : (
                <div className="flex items-center gap-4">
                  <Donut
                    segments={[
                      { value: readCount, color: '#94A3B8' },
                      { value: unreadCount, color: '#059669' },
                    ]}
                  />
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-600" /> Unread <span className="text-slate-400">{unreadCount}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-slate-400" /> Read <span className="text-slate-400">{readCount}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-4 space-y-3">
              <h3 className="font-bold text-slate-800 text-sm">Summary</h3>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-semibold">Overdue</span>
                <span className="font-bold text-red-600">{overdueCount}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-semibold">Unread</span>
                <span className="font-bold text-slate-800">{unreadCount}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-semibold">Total</span>
                <span className="font-bold text-slate-800">{totalCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;