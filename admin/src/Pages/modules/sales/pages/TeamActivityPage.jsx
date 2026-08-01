// admin/src/Pages/modules/sales/pages/TeamActivityPage.jsx — REPLACE ENTIRE FILE
import { useEffect, useState, useMemo } from 'react';
import { Eye, X, Users2, LogIn, Activity, Search, RefreshCw, Download, Printer, ChevronDown } from 'lucide-react';
import { useToast } from '../../../../Components/hooks/useToast';
import { listStaffDirectory, getUserActivity } from '../services/teamService';
import { listReportsForKam } from '../services/dailyReportService';
import { humanizeAction } from '../../../../Components/utils/format';
import Loader from '../../../../Components/Shared/Loader';
import Pagination from '../../../../Components/Shared/Pagination';
const ROLE_FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'KAM', label: 'KAM' },
  { key: 'SALES_COORDINATOR', label: 'Sales Coordinator' },
];

const Avatar = ({ name, size = 'w-10 h-10 text-xs' }) => {
  const initials = (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
  return (
    <div className={`${size} rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold shrink-0 ring-1 ring-inset ring-emerald-100`}>
      {initials || <Users2 size={14} />}
    </div>
  );
};

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

const MiniLineChart = ({ points }) => {
  const max = Math.max(1, ...points);
  const w = 100;
  const h = 32;
  const step = points.length > 1 ? w / (points.length - 1) : w;
  const coords = points.map((v, i) => `${i * step},${h - (v / max) * h}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-8" preserveAspectRatio="none">
      <polyline points={coords} fill="none" stroke="#059669" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
};

const HBar = ({ label, value, total, color }) => {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 mb-1">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
};

const TeamActivityPage = () => {
  const { showToast } = useToast();
  const [staff, setStaff] = useState([]);
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [activeUser, setActiveUser] = useState(null);
  const [activityItems, setActivityItems] = useState([]);
  const [skippedItems, setSkippedItems] = useState([]);
  const [detailTab, setDetailTab] = useState('activity');
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  useEffect(() => {
    setPage(1);
  }, [roleFilter]);
  const [activitySearch, setActivitySearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    listStaffDirectory()
      .then(setStaff)
      .catch((err) => showToast(err?.message || 'Failed to load team members', 'error'))
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = roleFilter === 'ALL' ? staff : staff.filter((s) => s.role === roleFilter);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageClamped = Math.min(page, totalPages);
  const pagedFiltered = filtered.slice((pageClamped - 1) * PAGE_SIZE, pageClamped * PAGE_SIZE);

  const loadUserDetail = async (user) => {
    setIsDetailLoading(true);
    setActivityItems([]);
    setSkippedItems([]);
    try {
      const items = await getUserActivity(user.id);
      setActivityItems(Array.isArray(items) ? items : []);
    } catch (err) {
      showToast(err?.message || 'Failed to load activity log', 'error');
    }
    try {
      const reports = await listReportsForKam(user.id);
      setSkippedItems(
        (reports || []).flatMap((r) => r.visits.filter((v) => v.completed === false).map((v) => ({ ...v, date: r.date })))
      );
    } catch {
      setSkippedItems([]);
    }
    setIsDetailLoading(false);
  };

  const openUser = async (user) => {
    setActiveUser(user);
    setDetailTab('activity');
    setActivitySearch('');
    setTypeFilter('');
    await loadUserDetail(user);
  };

  const activityTypes = useMemo(() => {
    const set = new Set(activityItems.map((i) => (i.type === 'LOGIN' ? 'LOGIN' : i.action || 'ACTION')));
    return Array.from(set);
  }, [activityItems]);

  const filteredActivity = useMemo(() => {
    const q = activitySearch.trim().toLowerCase();
    return activityItems.filter((item) => {
      const label = item.type === 'LOGIN' ? 'logged in' : humanizeAction(item.action);
      const matchesSearch = !q || label.toLowerCase().includes(q) || item.entity?.toLowerCase().includes(q);
      const itemType = item.type === 'LOGIN' ? 'LOGIN' : item.action || 'ACTION';
      const matchesType = !typeFilter || itemType === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [activityItems, activitySearch, typeFilter]);

  const loginCount = activityItems.filter((i) => i.type === 'LOGIN').length;
  const actionCount = activityItems.length - loginCount;
  const lastActive = activityItems[0]?.createdAt ? new Date(activityItems[0].createdAt) : null;

  const entityCounts = useMemo(() => {
    const counts = {};
    activityItems.forEach((i) => {
      if (i.entity) counts[i.entity] = (counts[i.entity] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
  }, [activityItems]);

  const weeklyTrend = useMemo(() => {
    const days = Array(7).fill(0);
    activityItems.forEach((i) => {
      if (!i.createdAt) return;
      const d = new Date(i.createdAt).getDay();
      const idx = (d + 6) % 7; // Monday-first
      days[idx] += 1;
    });
    return days;
  }, [activityItems]);

  const skipReasonCounts = useMemo(() => {
    const counts = {};
    skippedItems.forEach((v) => {
      const reason = v.reasonIfNotCompleted?.trim() || 'No reason given';
      counts[reason] = (counts[reason] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [skippedItems]);

  const exportActivity = () => {
    if (!activeUser) return;
    const rows = filteredActivity.map((i) => ({
      Time: i.createdAt ? new Date(i.createdAt).toLocaleString() : '',
      Type: i.type === 'LOGIN' ? 'Login' : humanizeAction(i.action),
      Entity: i.entity || '',
    }));
    if (rows.length === 0) return showToast('Nothing to export', 'warning');
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => `"${String(r[h]).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeUser.name.replace(/\s+/g, '_')}_activity.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) return <Loader fullScreen label="Loading team..." />;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[1440px] mx-auto px-3 sm:px-6 py-5 sm:py-6 space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users2 size={22} className="text-slate-400" /> Team Activity
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">Track team members' logins, system actions and skipped visits.</p>
        </div>

        {/* Role filters */}
        <div className="flex gap-2 flex-wrap">
          {ROLE_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setRoleFilter(f.key)}
              className={`px-4 py-2 text-xs font-bold rounded-lg border transition ${
                roleFilter === f.key ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Staff table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[560px]">
              <thead className="sticky top-0 bg-slate-50 z-10">
                <tr className="text-[10px] text-slate-400 font-bold uppercase tracking-wide border-b border-slate-200">
                  <th className="py-2.5 px-4">Name</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3 w-20 text-right">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-xs text-slate-400">
                      No team members found.
                    </td>
                  </tr>
                ) : (
                  pagedFiltered.map((u, idx) => (
                    <tr key={u.id} className={`align-top ${idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'} hover:bg-emerald-50/30 transition-colors`}>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar name={u.name} />
                          <span className="font-bold text-slate-800 text-sm truncate">{u.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ring-inset bg-blue-50 text-blue-700 ring-blue-200">
                          {u.role === 'KAM' ? 'KAM' : 'Sales Coordinator'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-xs text-slate-500 truncate">{u.email}</td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => openUser(u)}
                          aria-label={`View activity for ${u.name}`}
                          className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition inline-flex items-center justify-center"
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      <Pagination page={pageClamped} totalPages={totalPages} totalItems={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />

      {activeUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[92vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4 px-4 sm:px-6 py-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar name={activeUser.name} size="w-14 h-14 text-base" />
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 text-lg truncate">{activeUser.name}</p>
                  <p className="text-xs text-slate-400 truncate">{activeUser.email}</p>
                  <span className="inline-flex mt-1 items-center rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset bg-blue-50 text-blue-700 ring-blue-200">
                    {activeUser.role === 'KAM' ? 'Key Account Manager' : 'Sales Coordinator'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                <div className="text-center">
                  <p className="text-lg font-bold text-slate-800">{activityItems.length}</p>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Activities</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-slate-800">{loginCount}</p>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Logins</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-red-600">{skippedItems.length}</p>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Skipped Visits</p>
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-700">{lastActive ? lastActive.toLocaleString() : '—'}</p>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Last Active</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => loadUserDetail(activeUser)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-emerald-800 transition"
                >
                  <RefreshCw size={13} /> Refresh
                </button>
                <button
                  type="button"
                  onClick={exportActivity}
                  className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  <Download size={13} /> Export <ChevronDown size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  <Printer size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveUser(null)}
                  aria-label="Close"
                  className="w-8 h-8 rounded-full inline-flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 px-4 sm:px-6 pt-3 border-b border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => setDetailTab('activity')}
                className={`px-4 py-2 text-xs font-bold border-b-2 transition ${
                  detailTab === 'activity' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Activity Log ({activityItems.length})
              </button>
              <button
                type="button"
                onClick={() => setDetailTab('skipped')}
                className={`px-4 py-2 text-xs font-bold border-b-2 transition ${
                  detailTab === 'skipped' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Skipped Visits ({skippedItems.length})
              </button>
            </div>

            {/* Body: table + analytics */}
            <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
              <div className="lg:col-span-8 flex flex-col overflow-hidden border-r border-slate-100">
                {detailTab === 'activity' && (
                  <div className="flex flex-wrap items-center gap-2 px-4 sm:px-5 py-3 border-b border-slate-100 shrink-0">
                    <div className="relative flex-1 min-w-[160px]">
                      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        value={activitySearch}
                        onChange={(e) => setActivitySearch(e.target.value)}
                        maxLength={150}
                        placeholder="Search Activity"
                        className="w-full pl-7 pr-2 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className="border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 px-2.5 py-2 outline-none focus:border-emerald-500 bg-white shrink-0"
                    >
                      <option value="">All Types</option>
                      {activityTypes.map((t) => (
                        <option key={t} value={t}>
                          {t === 'LOGIN' ? 'Login' : humanizeAction(t)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="overflow-y-auto flex-1">
                  {isDetailLoading ? (
                    <Loader label="Loading..." />
                  ) : detailTab === 'activity' ? (
                    filteredActivity.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-10">No activity found.</p>
                    ) : (
                      <table className="w-full text-left border-collapse min-w-[480px]">
                        <thead className="sticky top-0 bg-slate-50 z-10">
                          <tr className="text-[10px] text-slate-400 font-bold uppercase tracking-wide border-b border-slate-200">
                            <th className="py-2.5 px-4 w-14">Type</th>
                            <th className="py-2.5 px-3">Description</th>
                            <th className="py-2.5 px-3">Entity</th>
                            <th className="py-2.5 px-3 w-44">Time</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredActivity.map((item, i) => (
                            <tr key={i} className={`align-top ${i % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'} hover:bg-emerald-50/30 transition-colors`}>
                              <td className="py-2.5 px-4">
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                    item.type === 'LOGIN' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                                  }`}
                                >
                                  {item.type === 'LOGIN' ? <LogIn size={14} /> : <Activity size={14} />}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-sm font-bold text-slate-800">
                                {item.type === 'LOGIN' ? 'Logged In' : humanizeAction(item.action)}
                              </td>
                              <td className="py-2.5 px-3 text-xs text-slate-500">{item.entity || '—'}</td>
                              <td className="py-2.5 px-3 text-xs text-slate-400 font-mono whitespace-nowrap">
                                {item.createdAt ? new Date(item.createdAt).toLocaleString() : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )
                  ) : skippedItems.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-10">No skipped visits.</p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {skippedItems.map((v, i) => (
                        <div key={i} className="px-4 sm:px-5 py-3.5">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-bold text-slate-800">{v.customerName}</p>
                            <span className="text-[10px] font-bold uppercase text-slate-400 shrink-0">{v.date}</span>
                          </div>
                          <p className="text-xs text-red-600 mt-1">{v.reasonIfNotCompleted}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Analytics panel */}
              <div className="lg:col-span-4 overflow-y-auto p-4 space-y-4 bg-slate-50/40">
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <h4 className="font-bold text-slate-800 text-xs mb-3">Activity Breakdown</h4>
                  {activityItems.length === 0 ? (
                    <p className="text-[11px] text-slate-400">No activity yet.</p>
                  ) : (
                    <div className="flex items-center gap-4">
                      <Donut
                        segments={[
                          { value: loginCount, color: '#2563EB' },
                          { value: actionCount, color: '#059669' },
                        ]}
                      />
                      <div className="space-y-1.5 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-600" /> Logins <span className="text-slate-400">{loginCount}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-600" /> Actions <span className="text-slate-400">{actionCount}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <h4 className="font-bold text-slate-800 text-xs mb-2">Weekly Activity Trend</h4>
                  <MiniLineChart points={weeklyTrend} />
                  <div className="flex justify-between text-[9px] font-bold text-slate-400 mt-1">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                      <span key={d}>{d}</span>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <h4 className="font-bold text-slate-800 text-xs mb-3">Most Active Entities</h4>
                  {entityCounts.length === 0 ? (
                    <p className="text-[11px] text-slate-400">No entity data yet.</p>
                  ) : (
                    <ol className="space-y-2 text-xs">
                      {entityCounts.map(([entity, count], idx) => (
                        <li key={entity} className="flex items-center justify-between gap-2">
                          <span className="text-slate-600 font-semibold truncate">
                            {idx + 1}. {entity}
                          </span>
                          <span className="text-slate-400 font-bold shrink-0">{count}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <h4 className="font-bold text-slate-800 text-xs mb-3">Skipped Visit Reasons</h4>
                  {skipReasonCounts.length === 0 ? (
                    <p className="text-[11px] text-slate-400">No skipped visits yet.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {skipReasonCounts.map(([reason, count]) => (
                        <HBar key={reason} label={reason} value={count} total={skippedItems.length} color="#EF4444" />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamActivityPage;