// admin/src/Pages/modules/sales/pages/MyActivityPage.jsx
import { useEffect, useState, useMemo } from 'react';
import { History as HistoryIcon, LogIn, Activity, Search, EyeOff, Clock } from 'lucide-react';
import { getMyActivity } from '../services/teamService';
import { listMyReports } from '../services/dailyReportService';
import { humanizeAction } from '../../../../Components/utils/format';
import Loader from '../../../../Components/Shared/Loader';
import Pagination from '../../../../Components/Shared/Pagination';

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

const MyActivityPage = () => {
  const [items, setItems] = useState([]);
  const [skipped, setSkipped] = useState([]);
  const [tab, setTab] = useState('activity');
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [tab, search]);

useEffect(() => {
    // Line Managers and Sales Coordinators don't hold the Daily Report
    // permission, so listMyReports() 403s for them — that used to reject
    // the whole Promise.all and silently skip setItems() too, leaving the
    // page looking empty even though their login/action history existed.
    // allSettled lets the activity log populate independently of whether
    // the reports call succeeds.
    Promise.allSettled([getMyActivity(), listMyReports()])
      .then(([activityResult, reportsResult]) => {
        setItems(activityResult.status === 'fulfilled' ? activityResult.value : []);
        const reports = reportsResult.status === 'fulfilled' ? reportsResult.value : [];
        const skips = reports.flatMap((r) =>
          r.visits.filter((v) => !v.completed).map((v) => ({ ...v, date: r.date }))
        );
        setSkipped(skips);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const loginCount = items.filter((i) => i.type === 'LOGIN').length;
  const actionCount = items.length - loginCount;

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        (item.type === 'LOGIN' ? 'logged in' : humanizeAction(item.action)).toLowerCase().includes(q) ||
        item.entity?.toLowerCase().includes(q)
    );
  }, [items, search]);

  if (isLoading) return <Loader fullScreen label="Loading activity..." />;

  const activeList = tab === 'skipped' ? skipped : filteredItems;
  const totalPages = Math.max(1, Math.ceil(activeList.length / PAGE_SIZE));
  const pageClamped = Math.min(page, totalPages);
  const pagedList = activeList.slice((pageClamped - 1) * PAGE_SIZE, pageClamped * PAGE_SIZE);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[1440px] mx-auto px-3 sm:px-6 py-5 sm:py-6 space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
              <HistoryIcon size={22} className="text-slate-400" /> My Activity
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">Track your login history, system actions and skipped visits.</p>
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              maxLength={150}
              placeholder="Search Activity"
              className="pl-7 pr-2 py-2.5 w-44 sm:w-64 rounded-lg border border-slate-200 text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KpiCard icon={Activity} label="Total Activities" value={items.length} iconBg="bg-emerald-50 text-emerald-600" />
          <KpiCard icon={LogIn} label="Login Sessions" value={loginCount} iconBg="bg-blue-50 text-blue-600" />
          <KpiCard icon={Activity} label="System Actions" value={actionCount} iconBg="bg-amber-50 text-amber-600" />
          <KpiCard icon={EyeOff} label="Skipped Visits" value={skipped.length} iconBg="bg-red-50 text-red-600" />
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8 space-y-4 min-w-0">
            {/* Tabs */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-2 flex gap-2 w-fit">
              <button
                type="button"
                onClick={() => setTab('activity')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
                  tab === 'activity' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                Activity Log
              </button>
              <button
                type="button"
                onClick={() => setTab('skipped')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
                  tab === 'skipped' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                Skipped Visits ({skipped.length})
              </button>
            </div>

            {tab === 'activity' ? (
              <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
                {filteredItems.length === 0 ? (
                  <p className="text-xs text-slate-400 px-5 py-10 text-center">No activity recorded yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[560px]">
                      <thead className="sticky top-0 bg-slate-50 z-10">
                        <tr className="text-[10px] text-slate-400 font-bold uppercase tracking-wide border-b border-slate-200">
                          <th className="py-2.5 px-4 w-16">Type</th>
                          <th className="py-2.5 px-3">Description</th>
                          <th className="py-2.5 px-3">Entity</th>
                          <th className="py-2.5 px-3 w-44">Date &amp; Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {pagedList.map((item, i) => (
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
                              {new Date(item.createdAt).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                     </table>
                  </div>
                )}
                <Pagination page={pageClamped} totalPages={totalPages} totalItems={activeList.length} pageSize={PAGE_SIZE} onChange={setPage} className="px-4 sm:px-5" />
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
                {skipped.length === 0 ? (
                  <p className="text-xs text-slate-400 px-5 py-10 text-center">No skipped visits.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {pagedList.map((v, i) => (
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
                <Pagination page={pageClamped} totalPages={totalPages} totalItems={activeList.length} pageSize={PAGE_SIZE} onChange={setPage} className="px-4 sm:px-5" />
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div className="lg:col-span-4 space-y-5 min-w-0">
            <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-4">
              <h3 className="font-bold text-slate-800 text-sm mb-3">Activity Breakdown</h3>
              {items.length === 0 ? (
                <p className="text-xs text-slate-400">No activity yet.</p>
              ) : (
                <div className="flex items-center gap-4">
                  <Donut
                    segments={[
                      { value: loginCount, color: '#2563EB' },
                      { value: actionCount, color: '#059669' },
                    ]}
                  />
                  <div className="space-y-1.5 text-xs">
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

            <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-4">
              <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-1.5">
                <Clock size={14} className="text-slate-400" /> Most Recent
              </h3>
              {items.length === 0 ? (
                <p className="text-xs text-slate-400">No activity yet.</p>
              ) : (
                <div className="space-y-3">
                  {items.slice(0, 5).map((item, i) => (
                    <div key={i} className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          item.type === 'LOGIN' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                        }`}
                      >
                        {item.type === 'LOGIN' ? <LogIn size={13} /> : <Activity size={13} />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-700 truncate">
                          {item.type === 'LOGIN' ? 'Logged In' : humanizeAction(item.action)}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">{new Date(item.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyActivityPage;