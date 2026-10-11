// admin/src/Pages/modules/sales/pages/TeamReportsPage.jsx — FULL REPLACE
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  X,
  Users,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  CalendarDays,
  ClipboardList,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { useToast } from "../../../../Components/hooks/useToast";
import { listKams } from "../services/teamService";
import { listPlansForKamId } from "../services/weeklyPlanService";
import { listReportsForKam } from "../services/dailyReportService";
import Loader from "../../../../Components/Shared/Loader";
import Pagination from "../../../../Components/Shared/Pagination";
import { downloadCsv } from "../../../../Components/utils/csv";

const PAGE_SIZE = 12;
const MAX_SEARCH = 150;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/* ---------------- helpers ---------------- */

const toISODate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const formatShortDate = (isoStr) => {
  if (!isoStr || !ISO_DATE_RE.test(isoStr)) return isoStr || "—";
  const d = new Date(`${isoStr}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? isoStr
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

const isWithinDateRange = (dateStr, from, to) => {
  if (!dateStr) return !(from || to);
  if (from && dateStr < from) return false;
  if (to && dateStr > to) return false;
  return true;
};

const matchesText = (q, ...values) =>
  !q || values.some((v) => v != null && String(v).toLowerCase().includes(q));

// Earliest first, wherever a list of visits is shown. Existing and prospect
// visits arrive as two separately ordered lists, so simply joining them gave
// 27, 28, 27 — each half in order, the whole thing not.
const byDay = (a, b) => (a.day || a.date || "").localeCompare(b.day || b.date || "");

const planVisits = (p) =>
  [...(p?.existingVisits ?? []), ...(p?.prospectVisits ?? [])].sort(byDay);

// Closed by the system because the day ended without an answer — not a skip
// anyone chose. Weekly plan visits carry `autoClosed`; daily report lines
// carry the raw `autoClosedAt`.
const isNotUpdated = (v) => !!(v?.autoClosed || v?.autoClosedAt);

const statusLabel = (v) =>
  isNotUpdated(v) ? "Not Updated" : v.completed === true ? "Completed" : v.completed === false ? "Skipped" : "Planned";

// Prevent CSV/formula injection when opened in Excel/Sheets.
const sanitizeCsvCell = (val) => {
  const s = val == null ? "" : String(val);
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
};
const sanitizeRows = (rows) =>
  rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, sanitizeCsvCell(v)])));

const safeFileName = (name) => (name || "report").replace(/[^\w-]+/g, "_").slice(0, 80);

// Rolling 7-day buckets anchored at the chosen "From" date.
const groupIntoWeekSets = (visits, anchorIso) => {
  const valid = visits.filter((v) => v.day && ISO_DATE_RE.test(v.day));
  if (valid.length === 0) return [];
  const anchor = anchorIso || valid.reduce((min, v) => (v.day < min ? v.day : min), valid[0].day);
  const anchorDate = new Date(`${anchor}T00:00:00`);
  const buckets = new Map();

  valid.forEach((v) => {
    const diffDays = Math.round((new Date(`${v.day}T00:00:00`) - anchorDate) / 86400000);
    const idx = Math.floor(diffDays / 7);
    if (!buckets.has(idx)) {
      const start = new Date(anchorDate);
      start.setDate(start.getDate() + idx * 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      buckets.set(idx, { key: `set_${idx}`, start: toISODate(start), end: toISODate(end), visits: [] });
    }
    buckets.get(idx).visits.push(v);
  });

  return Array.from(buckets.values())
    .sort((a, b) => (a.start < b.start ? -1 : 1))
    .map((b) => ({ ...b, visits: b.visits.sort((a, c) => (a.day < c.day ? -1 : 1)) }));
};

/* ---------------- small UI pieces ---------------- */

const Avatar = ({ name, size = "w-10 h-10 text-xs" }) => {
  const initials = (name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
  return (
    <div
      className={`${size} rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold shrink-0 ring-1 ring-inset ring-emerald-100`}
    >
      {initials || <Users size={14} />}
    </div>
  );
};

const STATUS_STYLES = {
  Completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Skipped: "bg-red-50 text-red-600 ring-red-200",
  "Not Updated": "bg-amber-50 text-amber-700 ring-amber-200",
  Planned: "bg-blue-50 text-blue-700 ring-blue-200",
};

const VisitStatusBadge = ({ v }) => {
  const label = statusLabel(v);
  const cls = STATUS_STYLES[label];
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset ${cls}`}
    >
      {label}
    </span>
  );
};

const VisitNote = ({ v }) =>
  isNotUpdated(v) ? (
    <span className="text-amber-700 break-words">{v.reasonIfNotCompleted || "Not updated by the end of the day"}</span>
  ) : v.completed === false ? (
    <span className="text-red-600 break-words">{v.reasonIfNotCompleted || "No reason given"}</span>
  ) : (
    <span className="text-slate-500 break-words">{v.outcomeNotes || "—"}</span>
  );

const EmptyState = ({ icon: Icon = ClipboardList, text }) => (
  <div className="flex flex-col items-center justify-center text-center py-12 px-4 text-slate-400">
    <Icon size={28} className="mb-2 opacity-60" />
    <p className="text-sm">{text}</p>
  </div>
);

const StatBox = ({ label, value, tone = "text-slate-800" }) => (
  <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5 text-center min-w-0">
    <p className={`text-lg sm:text-xl font-bold leading-tight ${tone}`}>{value}</p>
    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide truncate">{label}</p>
  </div>
);

const VisitList = ({ visits, showDate = true, showPurpose = true }) => (
  <>
    {/* Mobile: stacked cards */}
    <ul className="sm:hidden divide-y divide-slate-100">
      {visits.map((v, i) => (
        <li key={`${v.id ?? "v"}_${i}`} className="py-3 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-slate-800 break-words min-w-0">{v.customerName || "—"}</p>
            <VisitStatusBadge v={v} />
          </div>
          {(showDate || (showPurpose && v.purpose)) && (
            <p className="text-[11px] text-slate-400 break-words">
              {showDate ? formatShortDate(v.day || v.date) : ""}
              {showDate && showPurpose && v.purpose ? " · " : ""}
              {showPurpose ? v.purpose || "" : ""}
            </p>
          )}
          <p className="text-xs">
            <VisitNote v={v} />
          </p>
        </li>
      ))}
    </ul>

    {/* Tablet & up: table */}
    <div className="hidden sm:block overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="text-[10px] text-slate-400 font-bold uppercase tracking-wide border-b border-slate-200">
            {showDate && <th className="py-2 pr-3 whitespace-nowrap">Date</th>}
            <th className="py-2 pr-3">Customer</th>
            {showPurpose && <th className="py-2 pr-3">Purpose</th>}
            <th className="py-2 pr-3">Status</th>
            <th className="py-2">Outcome / Reason</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {visits.map((v, i) => (
            <tr key={`${v.id ?? "v"}_${i}`} className="text-xs align-top">
              {showDate && (
                <td className="py-2.5 pr-3 font-semibold text-slate-700 whitespace-nowrap">
                  {formatShortDate(v.day || v.date)}
                </td>
              )}
              <td className="py-2.5 pr-3 text-slate-700 font-medium break-words">{v.customerName || "—"}</td>
              {showPurpose && <td className="py-2.5 pr-3 text-slate-500 break-words">{v.purpose || "—"}</td>}
              <td className="py-2.5 pr-3">
                <VisitStatusBadge v={v} />
              </td>
              <td className="py-2.5">
                <VisitNote v={v} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </>
);

const Section = ({ id, title, subtitle, right, isOpen, onToggle, children }) => (
  <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      aria-controls={`${id}-panel`}
      className="w-full flex items-center justify-between gap-3 px-3 sm:px-4 py-3 text-left hover:bg-slate-50 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
    >
      <div className="flex items-center gap-3 min-w-0">
        <ChevronDown
          size={16}
          className={`text-slate-400 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-700 truncate">{title}</p>
          <p className="text-[11px] text-slate-400 truncate">{subtitle}</p>
        </div>
      </div>
      {right}
    </button>
    {isOpen && (
      <div id={`${id}-panel`} className="px-3 sm:px-4 pb-2 border-t border-slate-100">
        {children}
      </div>
    )}
  </div>
);

/* ---------------- page ---------------- */

const TeamReportsPage = () => {
  const { showToast } = useToast();

  const [kams, setKams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [activeKam, setActiveKam] = useState(null);
  const [tab, setTab] = useState("weekly");
  const [weeklyPlans, setWeeklyPlans] = useState([]);
  const [dailyReports, setDailyReports] = useState([]);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [reportSearch, setReportSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedKeys, setExpandedKeys] = useState(() => new Set());

  const requestIdRef = useRef(0);
  const closeBtnRef = useRef(null);

  const loadKams = useCallback(() => {
    setIsLoading(true);
    listKams()
      .then((data) => setKams(Array.isArray(data) ? data : []))
      .catch((err) => showToast(err?.message || "Failed to load team members", "error"))
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadKams();
  }, [loadKams]);

  const loadDetail = useCallback(
    async (kam) => {
      if (!kam?.id) return;
      const reqId = ++requestIdRef.current;
      setIsDetailLoading(true);
      const [plansRes, reportsRes] = await Promise.allSettled([
        listPlansForKamId(kam.id),
        listReportsForKam(kam.id),
      ]);
      if (reqId !== requestIdRef.current) return; // stale response (user switched/closed)
      setWeeklyPlans(plansRes.status === "fulfilled" && Array.isArray(plansRes.value) ? plansRes.value : []);
      setDailyReports(reportsRes.status === "fulfilled" && Array.isArray(reportsRes.value) ? reportsRes.value : []);
      const failed = [plansRes, reportsRes].find((r) => r.status === "rejected");
      if (failed) showToast(failed.reason?.message || "Failed to load some reports", "error");
      setIsDetailLoading(false);
    },
    [showToast]
  );

  const openKam = useCallback(
    (kam) => {
      setActiveKam(kam);
      setTab("weekly");
      setReportSearch("");
      setDateFrom("");
      setDateTo("");
      setExpandedKeys(new Set());
      setWeeklyPlans([]);
      setDailyReports([]);
      loadDetail(kam);
    },
    [loadDetail]
  );

  const closeModal = useCallback(() => {
    requestIdRef.current += 1;
    setActiveKam(null);
    setIsDetailLoading(false);
  }, []);

  // Modal: ESC to close, lock body scroll, focus close button
  useEffect(() => {
    if (!activeKam) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && closeModal();
    window.addEventListener("keydown", onKey);
    closeBtnRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [activeKam, closeModal]);

  const toggleExpanded = (key) =>
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const changeSearch = (value) => {
    setSearch(value.slice(0, MAX_SEARCH));
    setPage(1);
  };

  const changeDateFrom = (v) => {
    if (v && !ISO_DATE_RE.test(v)) return;
    setDateFrom(v);
    if (v && dateTo && v > dateTo) setDateTo(v);
  };
  const changeDateTo = (v) => {
    if (v && !ISO_DATE_RE.test(v)) return;
    setDateTo(v);
    if (v && dateFrom && v < dateFrom) setDateFrom(v);
  };
  const hasDateFilter = !!(dateFrom || dateTo);
  const hasAnyFilter = hasDateFilter || !!reportSearch.trim();
  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setReportSearch("");
  };

  /* --- KAM list --- */
  const filteredKams = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? kams.filter((k) => matchesText(q, k.name, k.email)) : kams;
  }, [kams, search]);

  const totalPages = Math.max(1, Math.ceil(filteredKams.length / PAGE_SIZE));
  const pageClamped = Math.min(page, totalPages);
  const pagedKams = filteredKams.slice((pageClamped - 1) * PAGE_SIZE, pageClamped * PAGE_SIZE);

  /* --- detail stats --- */
  // A visit the day closed on is counted against completion — it was not done
  // — but not as a skip, which is a decision somebody made and explained.
  const stats = useMemo(() => {
    let total = 0;
    let completed = 0;
    let skipped = 0;
    dailyReports.forEach((r) =>
      (r.visits ?? []).forEach((v) => {
        total += 1;
        if (v.completed === true) completed += 1;
        else if (v.completed === false && !isNotUpdated(v)) skipped += 1;
      })
    );
    return { total, completed, skipped, rate: total ? Math.round((completed / total) * 100) : 0 };
  }, [dailyReports]);

  const q = reportSearch.trim().toLowerCase();

  /* --- weekly --- */
  const filteredWeeklyPlans = useMemo(
    () =>
      weeklyPlans.filter(
        (p) => matchesText(q, p.weekStartDate) || planVisits(p).some((v) => matchesText(q, v.customerName))
      ),
    [weeklyPlans, q]
  );

  const weekSets = useMemo(() => {
    if (!hasDateFilter) return [];
    const flat = weeklyPlans
      .flatMap((p) => planVisits(p))
      .filter((v) => matchesText(q, v.customerName) && isWithinDateRange(v.day, dateFrom, dateTo));
    return groupIntoWeekSets(flat, dateFrom || undefined);
  }, [hasDateFilter, weeklyPlans, q, dateFrom, dateTo]);

  /* --- daily --- */
  const filteredDailyReports = useMemo(
    () =>
      dailyReports
        .filter(
          (r) =>
            isWithinDateRange(r.date, dateFrom, dateTo) &&
            (matchesText(q, r.date) || (r.visits ?? []).some((v) => matchesText(q, v.customerName)))
        )
        .slice()
        .sort(byDay),
    [dailyReports, q, dateFrom, dateTo]
  );

  /* --- skipped --- */
  // Only real skips — someone chose not to go and said why. Days the system
  // closed would otherwise swamp "Top Skip Reasons" with one line that tells
  // a manager nothing about why visits are being dropped.
  const skippedVisits = useMemo(
    () =>
      dailyReports
        .flatMap((r) =>
          (r.visits ?? [])
            .filter((v) => v.completed === false && !isNotUpdated(v))
            .map((v) => ({ ...v, date: r.date }))
        )
        .sort(byDay),
    [dailyReports]
  );

  const filteredSkipped = useMemo(
    () =>
      skippedVisits.filter(
        (v) => isWithinDateRange(v.date, dateFrom, dateTo) && matchesText(q, v.customerName, v.reasonIfNotCompleted)
      ),
    [skippedVisits, q, dateFrom, dateTo]
  );

  const skipReasonCounts = useMemo(() => {
    const counts = {};
    filteredSkipped.forEach((v) => {
      const reason = v.reasonIfNotCompleted?.trim() || "No reason given";
      counts[reason] = (counts[reason] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [filteredSkipped]);

  /* --- export --- */
  const exportReports = () => {
    if (!activeKam) return;
    let rows;
    if (tab === "weekly") {
      rows = hasDateFilter
        ? weekSets.flatMap((set) =>
            set.visits.map((v) => ({
              "Week Set": `${set.start} to ${set.end}`,
              Date: v.day,
              Customer: v.customerName,
              Purpose: v.purpose,
              Status: statusLabel(v),
              Outcome: v.completed === false ? v.reasonIfNotCompleted || "" : v.outcomeNotes || "",
            }))
          )
        : filteredWeeklyPlans.flatMap((p) =>
            planVisits(p).map((v) => ({
              Week: p.weekStartDate,
              Day: v.day,
              Customer: v.customerName,
              Purpose: v.purpose,
              Status: statusLabel(v),
              Outcome: v.completed === false ? v.reasonIfNotCompleted || "" : v.outcomeNotes || "",
            }))
          );
    } else if (tab === "daily") {
      rows = filteredDailyReports.flatMap((r) =>
        (r.visits ?? []).map((v) => ({
          Date: r.date,
          Customer: v.customerName,
          Status: statusLabel(v),
          Reason: v.reasonIfNotCompleted || "",
          Outcome: v.outcomeNotes || "",
        }))
      );
    } else {
      rows = filteredSkipped.map((v) => ({
        Date: v.date,
        Customer: v.customerName,
        Reason: v.reasonIfNotCompleted || "No reason given",
      }));
    }
    if (rows.length === 0) return showToast("Nothing to export", "warning");
    downloadCsv(`${safeFileName(activeKam.name)}_${tab}${hasAnyFilter ? "_filtered" : ""}.csv`, sanitizeRows(rows));
    showToast("Export downloaded", "success");
  };

  const tabs = [
    { key: "weekly", label: "Weekly Plans", short: "Weekly", count: weeklyPlans.length, icon: CalendarDays },
    { key: "daily", label: "Daily Reports", short: "Daily", count: dailyReports.length, icon: ClipboardList },
    { key: "skipped", label: "Skipped Visits", short: "Skipped", count: skippedVisits.length, icon: AlertTriangle },
  ];

  if (isLoading) return <Loader fullScreen label="Loading team..." />;

  /* --- tab content --- */
  const renderWeekly = () => {
    if (hasDateFilter) {
      if (weekSets.length === 0) return <EmptyState icon={CalendarDays} text="No visits found in this date range." />;
      return (
        <div className="space-y-3">
          {weekSets.map((set) => (
            <Section
              key={set.key}
              id={set.key}
              title={`${formatShortDate(set.start)} – ${formatShortDate(set.end)}`}
              subtitle={`${set.visits.length} visit(s)`}
              isOpen={expandedKeys.has(set.key)}
              onToggle={() => toggleExpanded(set.key)}
            >
              <VisitList visits={set.visits} />
            </Section>
          ))}
        </div>
      );
    }
    if (filteredWeeklyPlans.length === 0) return <EmptyState icon={CalendarDays} text="No weekly plans found." />;
    return (
      <div className="space-y-3">
        {filteredWeeklyPlans.map((p) => {
          const visits = planVisits(p);
          const key = `w_${p.id}`;
          return (
            <Section
              key={key}
              id={key}
              title={`Week of ${formatShortDate(p.weekStartDate)}`}
              subtitle={`${visits.length} visit(s)`}
              isOpen={expandedKeys.has(key)}
              onToggle={() => toggleExpanded(key)}
            >
              {visits.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No visits in this plan.</p>
              ) : (
                <VisitList visits={visits} />
              )}
            </Section>
          );
        })}
      </div>
    );
  };

  const renderDaily = () => {
    if (filteredDailyReports.length === 0) return <EmptyState icon={ClipboardList} text="No daily reports found." />;
    return (
      <div className="space-y-3">
        {filteredDailyReports.map((r) => {
          const visits = (r.visits ?? []).slice().sort((a, b) =>
            (a.customerName || "").localeCompare(b.customerName || "")
          );
          const done = visits.filter((v) => v.completed === true).length;
          const key = `d_${r.id}`;
          return (
            <Section
              key={key}
              id={key}
              title={formatShortDate(r.date)}
              subtitle={`${done}/${visits.length} completed`}
              right={
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    visits.length && done === visits.length
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {visits.length ? Math.round((done / visits.length) * 100) : 0}%
                </span>
              }
              isOpen={expandedKeys.has(key)}
              onToggle={() => toggleExpanded(key)}
            >
              {visits.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No visits logged.</p>
              ) : (
                <VisitList visits={visits} showDate={false} />
              )}
            </Section>
          );
        })}
      </div>
    );
  };

  const renderSkipped = () => {
    if (filteredSkipped.length === 0) return <EmptyState icon={CheckCircle2} text="No skipped visits." />;
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-red-100 bg-red-50/40 p-3 sm:p-4">
          <p className="text-xs font-bold text-slate-700 mb-2">Top Skip Reasons</p>
          <div className="space-y-2">
            {skipReasonCounts.map(([reason, count]) => {
              const pct = Math.round((count / filteredSkipped.length) * 100);
              return (
                <div key={reason}>
                  <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-600 mb-1">
                    <span className="truncate min-w-0">{reason}</span>
                    <span className="shrink-0 text-slate-400">
                      {count} · {pct}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white overflow-hidden">
                    <div className="h-full rounded-full bg-red-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {filteredSkipped.map((v, i) => (
            <li key={`${v.id ?? "s"}_${i}`} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-bold text-slate-800 break-words min-w-0">{v.customerName || "—"}</p>
                <span className="text-[10px] font-bold uppercase text-slate-400 shrink-0 whitespace-nowrap">
                  {formatShortDate(v.date)}
                </span>
              </div>
              <p className="text-xs text-red-600 mt-1 break-words">{v.reasonIfNotCompleted || "No reason given"}</p>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="w-full max-w-[1440px] min-[1921px]:max-w-[1800px] mx-auto px-3 sm:px-6 py-5 sm:py-6 space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl min-[1921px]:text-3xl font-bold text-slate-800 flex items-center gap-2">
              <Users size={22} className="text-slate-400 shrink-0" /> Team Reports
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {filteredKams.length} of {kams.length} KAM{kams.length === 1 ? "" : "s"} · click a member to view reports
            </p>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:flex-none">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => changeSearch(e.target.value)}
                maxLength={MAX_SEARCH}
                placeholder="Search by name or email"
                aria-label="Search team members"
                autoComplete="off"
                className="w-full md:w-64 lg:w-72 pl-8 pr-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <button
              type="button"
              onClick={loadKams}
              aria-label="Refresh team list"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 border border-slate-200 bg-white px-3 py-2.5 rounded-lg hover:bg-slate-50 transition shrink-0"
            >
              <RefreshCw size={14} />
              <span className="hidden min-[400px]:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* KAM cards */}
        {filteredKams.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200">
            <EmptyState icon={Users} text={search ? "No KAMs match your search." : "No KAMs found."} />
          </div>
        ) : (
          <>
            <ul className="grid grid-cols-1 min-[481px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 min-[1921px]:grid-cols-5 gap-3 sm:gap-4">
              {pagedKams.map((k) => (
                <li key={k.id}>
                  <button
                    type="button"
                    onClick={() => openKam(k)}
                    aria-label={`View reports for ${k.name}`}
                    className="group w-full h-full flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 text-left shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:border-emerald-300 hover:shadow-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  >
                    <Avatar name={k.name} size="w-11 h-11 text-sm" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-800 text-sm truncate">{k.name || "Unnamed"}</p>
                      <p className="text-[11px] text-slate-400 truncate">{k.email || "—"}</p>
                    </div>
                    <ChevronRight
                      size={18}
                      className="text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition shrink-0"
                    />
                  </button>
                </li>
              ))}
            </ul>
            <div className="bg-white rounded-xl border border-slate-200">
              <Pagination
                page={pageClamped}
                totalPages={totalPages}
                totalItems={filteredKams.length}
                pageSize={PAGE_SIZE}
                onChange={setPage}
                className="px-4 sm:px-5"
              />
            </div>
          </>
        )}
      </div>

      {/* Detail modal */}
      {activeKam && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-[2px] sm:p-4"
          onMouseDown={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="team-report-title"
            className="bg-white w-full sm:max-w-3xl lg:max-w-5xl min-[1921px]:max-w-6xl h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Modal header */}
            <div className="px-4 sm:px-6 pt-4 pb-3 border-b border-slate-100 shrink-0 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={activeKam.name} size="w-12 h-12 sm:w-14 sm:h-14 text-base" />
                  <div className="min-w-0">
                    <h2 id="team-report-title" className="font-bold text-slate-800 text-base sm:text-lg truncate">
                      {activeKam.name}
                    </h2>
                    <p className="text-xs text-slate-400 truncate">{activeKam.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => loadDetail(activeKam)}
                    disabled={isDetailLoading}
                    aria-label="Refresh reports"
                    className="w-9 h-9 rounded-full inline-flex items-center justify-center text-slate-500 hover:bg-slate-100 transition disabled:opacity-50"
                  >
                    <RefreshCw size={15} className={isDetailLoading ? "animate-spin" : ""} />
                  </button>
                  <button
                    ref={closeBtnRef}
                    type="button"
                    onClick={closeModal}
                    aria-label="Close"
                    className="w-9 h-9 rounded-full inline-flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <StatBox label="Weekly Plans" value={weeklyPlans.length} />
                <StatBox label="Daily Reports" value={dailyReports.length} />
                <StatBox label="Skipped" value={stats.skipped} tone="text-red-600" />
                <StatBox label="Completion" value={`${stats.rate}%`} tone="text-emerald-700" />
              </div>
            </div>

            {/* Tabs */}
            <div role="tablist" className="flex gap-1 px-2 sm:px-6 border-b border-slate-100 shrink-0 overflow-x-auto">
              {tabs.map((t) => {
                const Icon = t.icon;
                const active = tab === t.key;
                return (
                  <button
                    key={t.key}
                    role="tab"
                    aria-selected={active}
                    type="button"
                    onClick={() => setTab(t.key)}
                    className={`flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition ${
                      active
                        ? t.key === "skipped"
                          ? "border-red-500 text-red-600"
                          : "border-emerald-600 text-emerald-700"
                        : "border-transparent text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    <Icon size={14} />
                    <span className="sm:hidden">{t.short}</span>
                    <span className="hidden sm:inline">{t.label}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                        active ? "bg-slate-100 text-slate-700" : "bg-slate-50 text-slate-400"
                      }`}
                    >
                      {t.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row md:items-center gap-2 px-4 sm:px-6 py-3 border-b border-slate-100 shrink-0">
              <div className="relative flex-1 min-w-0">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="search"
                  value={reportSearch}
                  onChange={(e) => setReportSearch(e.target.value.slice(0, MAX_SEARCH))}
                  maxLength={MAX_SEARCH}
                  placeholder={tab === "skipped" ? "Search customer or reason..." : "Search customer..."}
                  aria-label="Search reports"
                  autoComplete="off"
                  className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 md:flex md:items-center">
                <label className="flex flex-col md:flex-row md:items-center gap-1 text-[11px] font-semibold text-slate-400 min-w-0">
                  <span>From</span>
                  <input
                    type="date"
                    value={dateFrom}
                    max={dateTo || undefined}
                    onChange={(e) => changeDateFrom(e.target.value)}
                    className="w-full md:w-auto min-w-0 border border-slate-200 rounded-lg px-2 py-2 text-xs text-slate-700 outline-none focus:border-emerald-500"
                  />
                </label>
                <label className="flex flex-col md:flex-row md:items-center gap-1 text-[11px] font-semibold text-slate-400 min-w-0">
                  <span>To</span>
                  <input
                    type="date"
                    value={dateTo}
                    min={dateFrom || undefined}
                    onChange={(e) => changeDateTo(e.target.value)}
                    className="w-full md:w-auto min-w-0 border border-slate-200 rounded-lg px-2 py-2 text-xs text-slate-700 outline-none focus:border-emerald-500"
                  />
                </label>
              </div>
              <div className="flex items-center gap-2">
                {hasAnyFilter && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="flex-1 md:flex-none text-xs font-bold text-slate-500 hover:text-red-500 border border-slate-200 md:border-transparent rounded-lg px-3 py-2 transition"
                  >
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  onClick={exportReports}
                  disabled={isDetailLoading}
                  className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-2 rounded-lg transition disabled:opacity-50 shrink-0"
                >
                  <FileSpreadsheet size={14} /> Export
                </button>
              </div>
            </div>

            {/* Body */}
            <div role="tabpanel" className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4 bg-slate-50/40">
              {isDetailLoading ? (
                <Loader label="Loading reports..." />
              ) : tab === "weekly" ? (
                renderWeekly()
              ) : tab === "daily" ? (
                renderDaily()
              ) : (
                renderSkipped()
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamReportsPage;