// admin/src/Pages/modules/sales/pages/TeamReportsPage.jsx — REPLACE ENTIRE FILE
import { useEffect, useState, useCallback, useMemo } from "react";
import { Eye, X, Users, Search, RefreshCw, ChevronRight, FileSpreadsheet } from "lucide-react";
import { useToast } from "../../../../Components/hooks/useToast";
import { listKams } from "../services/teamService";
import { listPlansForKamId } from "../services/weeklyPlanService";
import { listReportsForKam } from "../services/dailyReportService";
import { humanizeStatus } from "../../../../Components/utils/format";
import Loader from "../../../../Components/Shared/Loader";

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

const Avatar = ({ name, size = "w-9 h-9 text-xs" }) => {
  const initials = (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
  return (
    <div className={`${size} rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold shrink-0 ring-1 ring-inset ring-emerald-100`}>
      {initials || <Users size={14} />}
    </div>
  );
};

const StatusPill = ({ status }) => {
  const s = (status || "").toLowerCase();
  const cls = s.includes("approve") || s.includes("complet")
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : s.includes("reject") || s.includes("cancel")
    ? "bg-red-50 text-red-600 ring-red-200"
    : "bg-amber-50 text-amber-700 ring-amber-200";
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ring-1 ring-inset ${cls}`}>
      {status}
    </span>
  );
};

const TeamReportsPage = () => {
  const { showToast } = useToast();
  const [kams, setKams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeKam, setActiveKam] = useState(null);
  const [tab, setTab] = useState("weekly");
  const [weeklyPlans, setWeeklyPlans] = useState([]);
  const [dailyReports, setDailyReports] = useState([]);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [reportSearch, setReportSearch] = useState("");

  const loadKams = useCallback(() => {
    setIsLoading(true);
    listKams()
      .then(setKams)
      .catch((err) => showToast(err?.message || "Failed to load team members", "error"))
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadKams();
  }, [loadKams]);

  const openKam = useCallback(
    async (kam) => {
      setActiveKam(kam);
      setTab("weekly");
      setReportSearch("");
      setIsDetailLoading(true);
      try {
        const [plans, reports] = await Promise.all([listPlansForKamId(kam.id), listReportsForKam(kam.id)]);
        setWeeklyPlans(plans);
        setDailyReports(reports);
      } catch (err) {
        showToast(err?.message || "Failed to load reports", "error");
      } finally {
        setIsDetailLoading(false);
      }
    },
    [showToast]
  );

  const filteredKams = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return kams;
    return kams.filter((k) => k.name?.toLowerCase().includes(q) || k.email?.toLowerCase().includes(q));
  }, [kams, search]);

  const totalPlans = weeklyPlans.length;
  const totalReports = dailyReports.length;
  const totalVisitsAcrossReports = dailyReports.reduce((sum, r) => sum + r.visits.length, 0);
  const completedVisitsAcrossReports = dailyReports.reduce(
    (sum, r) => sum + r.visits.filter((v) => v.completed).length,
    0
  );
  const completionRate = totalVisitsAcrossReports
    ? Math.round((completedVisitsAcrossReports / totalVisitsAcrossReports) * 100)
    : 0;

  const filteredWeeklyPlans = useMemo(() => {
    const q = reportSearch.trim().toLowerCase();
    if (!q) return weeklyPlans;
    return weeklyPlans.filter(
      (p) =>
        p.weekStartDate?.toLowerCase().includes(q) ||
        [...p.existingVisits, ...p.prospectVisits].some((v) => v.customerName?.toLowerCase().includes(q))
    );
  }, [weeklyPlans, reportSearch]);

  const filteredDailyReports = useMemo(() => {
    const q = reportSearch.trim().toLowerCase();
    if (!q) return dailyReports;
    return dailyReports.filter(
      (r) => r.date?.toLowerCase().includes(q) || r.visits.some((v) => v.customerName?.toLowerCase().includes(q))
    );
  }, [dailyReports, reportSearch]);

  const exportReports = () => {
    const rows =
      tab === "weekly"
        ? filteredWeeklyPlans.flatMap((p) =>
            [...p.existingVisits, ...p.prospectVisits].map((v) => ({
              Week: p.weekStartDate,
              Day: v.day,
              Customer: v.customerName,
              Purpose: v.purpose,
              Outcome: v.outcomeNotes || "",
            }))
          )
        : filteredDailyReports.flatMap((r) =>
            r.visits.map((v) => ({
              Date: r.date,
              Customer: v.customerName,
              Status: v.completed ? "Completed" : "Not Completed",
              Reason: v.reasonIfNotCompleted || "",
              Outcome: v.outcomeNotes || "",
            }))
          );
    if (rows.length === 0) return showToast("Nothing to export", "warning");
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => `"${String(r[h]).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeKam.name.replace(/\s+/g, "_")}_${tab}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) return <Loader fullScreen label="Loading team..." />;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[1440px] mx-auto px-3 sm:px-6 py-5 sm:py-6 space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Users size={22} className="text-slate-400" /> Team Reports Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">Monitor team activities, weekly sales plans and daily visit reports.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                maxLength={150}
                placeholder="Search for employee"
                className="pl-7 pr-2 py-2.5 w-44 sm:w-56 rounded-lg border border-slate-200 text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <button
              type="button"
              onClick={loadKams}
              aria-label="Refresh"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 border border-slate-200 bg-white px-3 py-2.5 rounded-lg hover:bg-slate-50 transition"
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KpiCard icon={Users} label="Total KAM" value={kams.length} iconBg="bg-emerald-50 text-emerald-600" />
          <KpiCard icon={Users} label="Filtered Results" value={filteredKams.length} iconBg="bg-blue-50 text-blue-600" />
          {activeKam ? (
            <>
              <KpiCard icon={Users} label={`${activeKam.name}'s Reports`} value={totalPlans + totalReports} iconBg="bg-amber-50 text-amber-600" />
              <KpiCard icon={Users} label="Completion Rate" value={`${completionRate}%`} iconBg="bg-emerald-50 text-emerald-600" />
            </>
          ) : (
            <>
              <div className="rounded-xl border border-dashed border-slate-200 bg-white/60 p-4 flex items-center justify-center text-[11px] text-slate-400">
                Select a KAM to see details
              </div>
              <div className="rounded-xl border border-dashed border-slate-200 bg-white/60 p-4 items-center justify-center text-[11px] text-slate-400 hidden sm:flex" />
            </>
          )}
        </div>

        {/* Main split layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left: KAM list */}
          <div className={`${activeKam ? "lg:col-span-4" : "lg:col-span-12"} bg-white rounded-xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.05)] transition-all`}>
            <div className="flex justify-between items-center px-4 sm:px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">KAM Team</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[420px]">
                <thead className="sticky top-0 bg-slate-50 z-10">
                  <tr className="text-[10px] text-slate-400 font-bold uppercase tracking-wide border-b border-slate-200">
                    <th className="py-2.5 px-4">KAM Name</th>
                    {!activeKam && <th className="py-2.5 px-3">Email</th>}
                    <th className="py-2.5 px-3 w-16 text-right">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredKams.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-10 text-center text-xs text-slate-400">
                        No KAMs found.
                      </td>
                    </tr>
                  ) : (
                    filteredKams.map((k, idx) => {
                      const isActive = activeKam?.id === k.id;
                      return (
                        <tr
                          key={k.id}
                          onClick={() => openKam(k)}
                          className={`align-top cursor-pointer transition-colors ${
                            isActive ? "bg-emerald-50/50" : idx % 2 === 1 ? "bg-slate-50/50" : "bg-white"
                          } hover:bg-emerald-50/40`}
                        >
                          <td className="py-2.5 px-4">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Avatar name={k.name} />
                              <div className="min-w-0">
                                <p className="font-bold text-slate-800 text-sm truncate">{k.name}</p>
                                {activeKam && <p className="text-[10px] text-slate-400 truncate">{k.email}</p>}
                              </div>
                            </div>
                          </td>
                          {!activeKam && <td className="py-2.5 px-3 text-xs text-slate-500 truncate">{k.email}</td>}
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openKam(k);
                              }}
                              aria-label={`View reports for ${k.name}`}
                              className={`w-8 h-8 rounded-full transition inline-flex items-center justify-center ${
                                isActive ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                              }`}
                            >
                              {isActive ? <ChevronRight size={15} /> : <Eye size={15} />}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: Detail panel */}
          {activeKam && (
            <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
              {/* Profile header */}
              <div className="flex flex-wrap items-center justify-between gap-4 px-4 sm:px-5 py-4 border-b border-slate-100">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={activeKam.name} size="w-14 h-14 text-base" />
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 text-lg truncate">{activeKam.name}</p>
                    <p className="text-xs text-slate-400 truncate">{activeKam.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="text-center">
                    <p className="text-lg font-bold text-slate-800">{totalPlans}</p>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase">Weekly Plans</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-slate-800">{totalReports}</p>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase">Daily Reports</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-emerald-700">{completionRate}%</p>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase">Completion</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveKam(null)}
                  aria-label="Close detail panel"
                  className="w-8 h-8 rounded-full inline-flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 px-4 sm:px-5 pt-3 border-b border-slate-100">
                {[
                  { key: "weekly", label: `Weekly Plans (${totalPlans})` },
                  { key: "daily", label: `Daily Reports (${totalReports})` },
                ].map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTab(t.key)}
                    className={`px-4 py-2 text-xs font-bold border-b-2 transition ${
                      tab === t.key ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Filter bar */}
              <div className="flex flex-wrap items-center gap-2 px-4 sm:px-5 py-3 border-b border-slate-100">
                <div className="relative flex-1 min-w-[160px]">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={reportSearch}
                    onChange={(e) => setReportSearch(e.target.value)}
                    maxLength={150}
                    placeholder="Search customer or date..."
                    className="w-full pl-7 pr-2 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={exportReports}
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-600 border border-slate-200 bg-white px-3 py-2 rounded-lg hover:bg-slate-50 transition shrink-0"
                >
                  <FileSpreadsheet size={13} /> Export
                </button>
              </div>

              {/* Content */}
              <div className="p-4 sm:p-5 overflow-y-auto max-h-[560px]">
                {isDetailLoading ? (
                  <Loader label="Loading..." />
                ) : tab === "weekly" ? (
                  filteredWeeklyPlans.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-8">No weekly plans found.</p>
                  ) : (
                    <div className="space-y-3">
                      {filteredWeeklyPlans.map((p) => (
                        <div key={p.id} className="border border-slate-200 rounded-xl p-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-slate-700">Week of {p.weekStartDate}</span>
                            <StatusPill status={humanizeStatus(p.status)} />
                          </div>
                          {p.lmComments && (
                            <p className="text-xs text-red-600 mb-2">
                              <strong>Feedback:</strong> {p.lmComments}
                            </p>
                          )}
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[480px]">
                              <thead>
                                <tr className="text-[10px] text-slate-400 font-bold uppercase tracking-wide border-b border-slate-200">
                                  <th className="py-2 pr-3">Day</th>
                                  <th className="py-2 pr-3">Customer Name</th>
                                  <th className="py-2 pr-3">Purpose</th>
                                  <th className="py-2">Outcome / Notes</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {[...p.existingVisits, ...p.prospectVisits].map((v) => (
                                  <tr key={v.id} className="text-xs align-top">
                                    <td className="py-2.5 pr-3 font-bold text-slate-700">{v.day}</td>
                                    <td className="py-2.5 pr-3 text-slate-700">{v.customerName}</td>
                                    <td className="py-2.5 pr-3 text-slate-500">{v.purpose}</td>
                                    <td className="py-2.5 text-slate-500">{v.outcomeNotes || "—"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : filteredDailyReports.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">No daily reports found.</p>
                ) : (
                  <div className="space-y-3">
                    {filteredDailyReports.map((r) => (
                      <div key={r.id} className="border border-slate-200 rounded-xl p-4">
                        <p className="text-xs font-bold text-slate-700 mb-2">{r.date}</p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse min-w-[520px]">
                            <thead>
                              <tr className="text-[10px] text-slate-400 font-bold uppercase tracking-wide border-b border-slate-200">
                                <th className="py-2 pr-3">Customer Name</th>
                                <th className="py-2 pr-3">Status</th>
                                <th className="py-2 pr-3">Reason (if not completed)</th>
                                <th className="py-2">Outcome / Notes</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {r.visits.map((v) => (
                                <tr key={v.id} className="text-xs align-top">
                                  <td className="py-2.5 pr-3 font-semibold text-slate-700">{v.customerName}</td>
                                  <td className="py-2.5 pr-3">
                                    <StatusPill status={v.completed ? "Completed" : "Not Completed"} />
                                  </td>
                                  <td className="py-2.5 pr-3 text-slate-500">{v.reasonIfNotCompleted || "—"}</td>
                                  <td className="py-2.5 text-slate-500">{v.outcomeNotes || "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamReportsPage;