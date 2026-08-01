// FILE: admin/src/Pages/modules/sales/roles/KAM/DailyVisitingReport.jsx
import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Lock,
  Save,
  Pencil,
  CalendarRange,
  RotateCcw,
  FileSpreadsheet,
  Search,
  Filter,
  Eye,
  Download,
  ClipboardList,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useToast } from '../../../../../Components/hooks/useToast';
import { getReportByDate, saveReport, listMyReports } from '../../services/dailyReportService';
import { todayLocalISO as todayISO } from '../../../../../Components/utils/date';
import CustomerSearchSelect from '../../components/CustomerSearchSelect';

const buildManualEntry = () => ({
  id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  customerName: '',
  customerId: null,
  purpose: '',
  completed: null,
  reasonIfNotCompleted: '',
  outcomeNotes: '',
  sourceVisitId: null,
  isManual: true,
  locked: false,
});

const normalize = (v) => ({
  ...v,
  customerId: v.customerId || null,
  reasonIfNotCompleted: v.reasonIfNotCompleted || '',
  outcomeNotes: v.outcomeNotes || '',
  purpose: v.purpose || '',
  isManual: !v.sourceVisitId,
  locked: !!v.id && !String(v.id).startsWith('m_') && !String(v.id).startsWith('plan_'),
});

const StatusPill = ({ completed }) => {
  if (completed === true)
    return (
      <span className="inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset bg-emerald-50 text-emerald-700 ring-emerald-200">
        Completed
      </span>
    );
  if (completed === false)
    return (
      <span className="inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset bg-red-50 text-red-600 ring-red-200">
        Skipped
      </span>
    );
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset bg-blue-50 text-blue-700 ring-blue-200">
      Planned
    </span>
  );
};

const TypeBadge = ({ isManual }) =>
  isManual ? (
    <span className="inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset bg-amber-50 text-amber-700 ring-amber-200">
      Additional
    </span>
  ) : (
    <span className="inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset bg-emerald-50 text-emerald-700 ring-emerald-200">
      Scheduled
    </span>
  );

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

const ProgressRing = ({ percent }) => {
  const r = 34;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(100, percent)) / 100) * c;
  return (
    <div className="relative w-20 h-20 shrink-0">
      <svg viewBox="0 0 80 80" className="w-20 h-20 -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="#E2E8F0" strokeWidth="8" />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke="#059669"
          strokeWidth="8"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-slate-800">{percent}%</span>
      </div>
    </div>
  );
};

const MiniCalendar = ({ selectedDate }) => {
  const sel = new Date(selectedDate);
  const monthDate = new Date(sel.getFullYear(), sel.getMonth(), 1);
  const monthLabel = monthDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const cells = useMemo(() => {
    const firstDay = new Date(monthDate);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const gridStart = new Date(firstDay);
    gridStart.setDate(firstDay.getDate() - startOffset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      return d;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const isSelected = (d) => d.toDateString() === sel.toDateString();
  const isCurrentMonth = (d) => d.getMonth() === monthDate.getMonth();

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-slate-800 text-sm">Mini Calendar</h3>
        <span className="text-[11px] font-semibold text-slate-400">{monthLabel}</span>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 mb-1">
        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => (
          <div
            key={i}
            className={`aspect-square flex items-center justify-center text-[11px] rounded-full ${
              !isCurrentMonth(d) ? 'text-slate-300' : 'text-slate-600'
            } ${isSelected(d) ? 'bg-emerald-600 text-white font-bold' : ''}`}
          >
            {d.getDate()}
          </div>
        ))}
      </div>
    </div>
  );
};

const VisitRow = ({ v, savingId, onUpdate, onSave, onUnlock, onRemove }) => {
  const isSaving = savingId === v.id;

  if (v.locked) {
    return (
      <tr className="align-top bg-white hover:bg-emerald-50/30 transition-colors">
        <td className="py-3 px-4">
          <TypeBadge isManual={v.isManual} />
        </td>
        <td className="py-3 px-3">
          <p className="text-sm font-bold text-slate-800 truncate max-w-[180px]">{v.customerName || '(no name)'}</p>
        </td>
        <td className="py-3 px-3 text-xs text-slate-500 max-w-[220px] truncate">{v.purpose || '—'}</td>
        <td className="py-3 px-3">
          <StatusPill completed={v.completed} />
        </td>
        <td className="py-3 px-3 text-xs text-slate-500 max-w-[220px]">
          {v.completed === false && v.reasonIfNotCompleted && (
            <p className="text-red-600">
              <span className="font-bold">Reason:</span> {v.reasonIfNotCompleted}
            </p>
          )}
          {v.outcomeNotes && <p className="text-slate-500 mt-0.5 truncate">{v.outcomeNotes}</p>}
        </td>
        <td className="py-3 px-3 text-right whitespace-nowrap">
          <button
            type="button"
            onClick={() => onUnlock(v.id)}
            className="text-slate-300 hover:text-emerald-600 transition"
            aria-label="Edit this visit"
          >
            <Pencil size={13} />
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="align-top bg-white">
      <td className="py-3 px-4">
        <TypeBadge isManual={v.isManual} />
      </td>
      <td className="py-3 px-3 min-w-[200px]">
        {v.isManual ? (
          <CustomerSearchSelect
            value={v.customerName}
            onSelect={({ customerName, customerId }) => onUpdate({ ...v, customerName, customerId })}
          />
        ) : (
          <div className="flex items-center gap-1.5">
            <input
              disabled
              className="w-full border p-2 rounded-lg text-xs outline-none bg-slate-50 text-slate-500 border-slate-100 font-semibold"
              value={v.customerName}
            />
            <Lock size={11} className="text-slate-300 shrink-0" />
          </div>
        )}
      </td>
      <td className="py-3 px-3 min-w-[180px]">
        {v.isManual ? (
          <p className="text-xs text-slate-400 italic">No purpose set</p>
        ) : (
          <div className="flex items-center gap-1.5">
            <input
              disabled
              className="w-full border p-2 rounded-lg text-xs outline-none bg-slate-50 text-slate-500 border-slate-100"
              value={v.purpose}
            />
            <Lock size={11} className="text-slate-300 shrink-0" />
          </div>
        )}
      </td>
      <td className="py-3 px-3 min-w-[160px]">
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => onUpdate({ ...v, completed: true })}
            className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 ${
              v.completed === true ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            <CheckCircle2 size={13} /> Done
          </button>
          <button
            type="button"
            onClick={() => onUpdate({ ...v, completed: false })}
            className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 ${
              v.completed === false ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            <XCircle size={13} /> Skip
          </button>
        </div>
      </td>
      <td className="py-3 px-3 min-w-[220px] space-y-1.5">
        {v.completed === false && (
          <textarea
            className="w-full border border-red-200 p-2 rounded-lg text-xs outline-none focus:border-red-500 min-h-[44px]"
            placeholder="Reason for skip"
            value={v.reasonIfNotCompleted}
            maxLength={500}
            onChange={(e) => onUpdate({ ...v, reasonIfNotCompleted: e.target.value })}
          />
        )}
        <textarea
          className="w-full border border-slate-200 p-2 rounded-lg text-xs outline-none focus:border-emerald-500 min-h-[44px]"
          placeholder="Outcome / notes (optional)"
          value={v.outcomeNotes}
          maxLength={500}
          onChange={(e) => onUpdate({ ...v, outcomeNotes: e.target.value })}
        />
      </td>
      <td className="py-3 px-3 text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-1.5">
          {isSaving ? (
            <Loader2 size={14} className="animate-spin text-slate-400" />
          ) : (
            <button
              type="button"
              onClick={() => onSave(v)}
              aria-label="Save this visit"
              className="text-slate-300 hover:text-emerald-600 transition"
            >
              <Save size={14} />
            </button>
          )}
          {v.isManual && (
            <button
              type="button"
              onClick={() => onRemove(v.id)}
              aria-label="Remove visit"
              className="text-slate-300 hover:text-red-500 transition"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};

const DailyVisitingReport = () => {
  const { showToast } = useToast();
  const [date, setDate] = useState(todayISO());
  const [visits, setVisits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [history, setHistory] = useState([]);
  const [expandedReportId, setExpandedReportId] = useState(null);
  const [historySearch, setHistorySearch] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const HISTORY_PAGE_SIZE = 4;

  const loadHistory = useCallback(() => {
    listMyReports()
      .then((reports) => setHistory(reports.filter((r) => r.date !== todayISO())))
      .catch(() => setHistory([]));
  }, []);

  const loadForDate = useCallback(async (targetDate) => {
    setIsLoading(true);
    try {
      const existing = await getReportByDate(targetDate);
      setVisits(existing?.visits?.length ? existing.visits.map(normalize) : []);
    } catch {
      setVisits([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadForDate(date);
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const updateLocal = (id, updated) => setVisits((prev) => prev.map((v) => (v.id === id ? updated : v)));
  const addManualVisit = () => setVisits((prev) => [...prev, buildManualEntry()]);

  const persist = useCallback(
    async (nextVisits, id) => {
      setSavingId(id);
      try {
        const saved = await saveReport({ date, visits: nextVisits });
        setVisits(saved.visits.map(normalize));
        loadHistory();
        showToast('Report saved', 'success');
      } catch (err) {
        showToast(err?.message || 'Failed to save', 'error');
      } finally {
        setSavingId(null);
      }
    },
    [date, showToast, loadHistory]
  );

  const removeVisit = (id) => {
    if (String(id).startsWith('m_')) {
      setVisits((prev) => prev.filter((v) => v.id !== id));
      return;
    }
    if (!window.confirm("Remove this saved visit from today's report?")) return;
    persist(visits.filter((v) => v.id !== id), id);
  };

  const unlockRow = (id) => setVisits((prev) => prev.map((v) => (v.id === id ? { ...v, locked: false } : v)));

  const handleSaveRow = (v) => {
    if (!v.customerName.trim()) return showToast('Enter a customer name first', 'warning');
    if (v.completed === false && !v.reasonIfNotCompleted.trim()) {
      return showToast('Enter a reason for skipping this visit', 'warning');
    }
    persist(visits.map((r) => (r.id === v.id ? v : r)), v.id);
  };

  const handleSaveAll = () => {
    if (savingId) return;
    persist(visits, 'all');
  };

  const exportExcel = () => {
    const rows = visits.map((v) => ({
      Type: v.isManual ? 'Additional' : 'Scheduled',
      'Customer Name': v.customerName,
      Purpose: v.purpose,
      Status: v.completed === true ? 'Completed' : v.completed === false ? 'Skipped' : 'Planned',
      'Reason (if skipped)': v.reasonIfNotCompleted || '',
      'Outcome / Notes': v.outcomeNotes || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Daily Report');
    XLSX.writeFile(wb, `daily-report-${date}.xlsx`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-slate-400 gap-2">
        <Loader2 size={16} className="animate-spin" /> Loading report...
      </div>
    );
  }

  const planVisits = visits.filter((v) => !v.isManual);
  const manualVisits = visits.filter((v) => v.isManual);
  const completedCount = visits.filter((v) => v.completed === true).length;
  const skippedCount = visits.filter((v) => v.completed === false).length;
  const plannedCount = visits.filter((v) => v.completed === null).length;
  const completionPercent = visits.length ? Math.round((completedCount / visits.length) * 100) : 0;

  const filteredHistory = history.filter((r) => {
    if (!historySearch.trim()) return true;
    return r.date.toLowerCase().includes(historySearch.toLowerCase());
  });
  const historyTotalPages = Math.max(1, Math.ceil(filteredHistory.length / HISTORY_PAGE_SIZE));
  const historyPageClamped = Math.min(historyPage, historyTotalPages);
  const pagedHistory = filteredHistory.slice(
    (historyPageClamped - 1) * HISTORY_PAGE_SIZE,
    historyPageClamped * HISTORY_PAGE_SIZE
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[1440px] mx-auto px-3 sm:px-6 py-5 sm:py-6 space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Daily Visiting Report</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">Record today's customer visits, outcomes and follow-up information.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 border border-slate-200 bg-white px-3 py-2.5 rounded-lg cursor-pointer hover:bg-slate-50 transition">
              <CalendarRange size={14} />
              <input
                type="date"
                max={todayISO()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="outline-none bg-transparent"
              />
            </label>
            {date !== todayISO() && (
              <button
                type="button"
                onClick={() => setDate(todayISO())}
                className="text-xs font-bold text-slate-600 border border-slate-200 bg-white px-3 py-2.5 rounded-lg flex items-center hover:bg-slate-50 transition"
              >
                <RotateCcw size={13} className="mr-1.5" /> Today
              </button>
            )}
            <button
              type="button"
              onClick={exportExcel}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 border border-slate-200 bg-white px-3 py-2.5 rounded-lg hover:bg-slate-50 transition"
            >
              <FileSpreadsheet size={14} /> Export Excel
            </button>
            <button
              type="button"
              disabled={savingId === 'all'}
              onClick={handleSaveAll}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-emerald-800 transition disabled:opacity-50"
            >
              {savingId === 'all' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save Report
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KpiCard icon={CalendarRange} label="Today's Planned Visits" value={plannedCount} iconBg="bg-blue-50 text-blue-600" />
          <KpiCard icon={CheckCircle2} label="Completed Visits" value={completedCount} iconBg="bg-emerald-50 text-emerald-600" />
          <KpiCard icon={XCircle} label="Skipped Visits" value={skippedCount} iconBg="bg-red-50 text-red-600" />
          <KpiCard icon={ClipboardList} label="Additional Visits" value={manualVisits.length} iconBg="bg-amber-50 text-amber-600" />
        </div>

        {/* Main grid: content + sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8 space-y-5 min-w-0">
            <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <div className="flex justify-between items-center px-4 sm:px-5 py-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-800 text-sm">Scheduled Visits (from Weekly Plan)</h3>
              </div>
              {planVisits.length === 0 ? (
                <p className="text-xs text-slate-400 px-5 py-6">No visits scheduled from your Weekly Plan for this date.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[860px]">
                    <thead className="sticky top-0 bg-slate-50 z-10">
                      <tr className="text-[10px] text-slate-400 font-bold uppercase tracking-wide border-b border-slate-200">
                        <th className="py-2.5 px-4 w-28">Type</th>
                        <th className="py-2.5 px-3">Customer Name</th>
                        <th className="py-2.5 px-3">Purpose</th>
                        <th className="py-2.5 px-3 w-40">Visit Status</th>
                        <th className="py-2.5 px-3">Outcome / Notes</th>
                        <th className="py-2.5 px-3 w-16 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {planVisits.map((v) => (
                        <VisitRow
                          key={v.id}
                          v={v}
                          savingId={savingId}
                          onUpdate={(updated) => updateLocal(v.id, updated)}
                          onSave={handleSaveRow}
                          onUnlock={unlockRow}
                          onRemove={removeVisit}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <div className="flex justify-between items-center px-4 sm:px-5 py-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-800 text-sm">Additional Visits (not in Weekly Plan)</h3>
                <button
                  type="button"
                  onClick={addManualVisit}
                  className="text-xs font-bold text-emerald-700 flex items-center hover:text-emerald-800 shrink-0"
                >
                  <Plus size={14} className="mr-1" /> Add Visit Entry
                </button>
              </div>
              {manualVisits.length === 0 ? (
                <p className="text-xs text-slate-400 px-5 py-6">No additional visits logged yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[860px]">
                    <thead className="sticky top-0 bg-slate-50 z-10">
                      <tr className="text-[10px] text-slate-400 font-bold uppercase tracking-wide border-b border-slate-200">
                        <th className="py-2.5 px-4 w-28">Type</th>
                        <th className="py-2.5 px-3">Customer Name</th>
                        <th className="py-2.5 px-3">Purpose</th>
                        <th className="py-2.5 px-3 w-40">Visit Status</th>
                        <th className="py-2.5 px-3">Outcome / Notes</th>
                        <th className="py-2.5 px-3 w-16 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {manualVisits.map((v) => (
                        <VisitRow
                          key={v.id}
                          v={v}
                          savingId={savingId}
                          onUpdate={(updated) => updateLocal(v.id, updated)}
                          onSave={handleSaveRow}
                          onUnlock={unlockRow}
                          onRemove={removeVisit}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-4 space-y-5 min-w-0">
            {/* Today's Summary */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-4">
              <h3 className="font-bold text-slate-800 text-sm mb-3">Today's Summary</h3>
              <div className="flex items-center gap-4">
                <ProgressRing percent={completionPercent} />
                <div className="grid grid-cols-1 gap-2 flex-1 min-w-0">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-semibold">Completed</span>
                    <span className="font-bold text-slate-800">{completedCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-semibold">Skipped</span>
                    <span className="font-bold text-slate-800">{skippedCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-semibold">Pending</span>
                    <span className="font-bold text-slate-800">{plannedCount}</span>
                  </div>
                </div>
              </div>
            </div>

            <MiniCalendar selectedDate={date} />

            {/* Quick Actions */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-4 space-y-2">
              <h3 className="font-bold text-slate-800 text-sm mb-1">Quick Actions</h3>
              <button
                type="button"
                onClick={addManualVisit}
                className="w-full inline-flex items-center gap-2 justify-center text-xs font-bold text-slate-700 border border-slate-200 rounded-lg px-3 py-2.5 hover:bg-slate-50 transition"
              >
                <Plus size={14} /> Add Manual Visit
              </button>
              <button
                type="button"
                onClick={exportExcel}
                className="w-full inline-flex items-center gap-2 justify-center text-xs font-bold text-slate-700 border border-slate-200 rounded-lg px-3 py-2.5 hover:bg-slate-50 transition"
              >
                <FileSpreadsheet size={14} /> Export Excel
              </button>
            </div>

            {/* Recent Reports */}
            {history.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
                <div className="p-4 pb-2">
                  <h3 className="font-bold text-slate-800 text-sm">Recent Reports</h3>
                </div>
                <div className="px-4 pb-3 flex items-center gap-2">
                  <div className="relative flex-1 min-w-0">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={historySearch}
                      onChange={(e) => {
                        setHistorySearch(e.target.value);
                        setHistoryPage(1);
                      }}
                      maxLength={100}
                      placeholder="Search date..."
                      className="w-full pl-7 pr-2 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 border border-slate-200 rounded-lg px-2.5 py-2 hover:bg-slate-50 transition shrink-0"
                  >
                    <Filter size={12} /> Filter
                  </button>
                </div>
                <div className="divide-y divide-slate-100">
                  {pagedHistory.map((r) => (
                    <div key={r.id}>
                      <div className="w-full flex justify-between items-center px-4 py-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setExpandedReportId(expandedReportId === r.id ? null : r.id)}
                          className="flex-1 flex items-center justify-between text-left hover:opacity-75 transition min-w-0"
                        >
                          <span className="text-xs font-bold text-slate-700 truncate">{r.date}</span>
                          <span className="text-[10px] text-slate-400 shrink-0 ml-2">{r.visits.length} visit(s)</span>
                        </button>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setExpandedReportId(expandedReportId === r.id ? null : r.id)}
                            aria-label="View this report"
                            className="w-7 h-7 rounded-full text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition inline-flex items-center justify-center"
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDate(r.date)}
                            aria-label="Edit this report"
                            className="w-7 h-7 rounded-full text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition inline-flex items-center justify-center"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={exportExcel}
                            aria-label="Download this report"
                            className="w-7 h-7 rounded-full text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition inline-flex items-center justify-center"
                          >
                            <Download size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setExpandedReportId(expandedReportId === r.id ? null : r.id)}
                            aria-label="Toggle details"
                            className="w-7 h-7 rounded-full text-slate-300 hover:text-slate-600 transition inline-flex items-center justify-center"
                          >
                            {expandedReportId === r.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </div>
                      </div>
                      {expandedReportId === r.id && (
                        <div className="px-4 pb-4 overflow-x-auto">
                          <table className="w-full text-left border-collapse min-w-[420px] text-xs">
                            <thead>
                              <tr className="text-[10px] text-slate-400 font-bold uppercase tracking-wide border-b border-slate-200">
                                <th className="py-2 pr-3">Customer</th>
                                <th className="py-2 pr-3">Status</th>
                                <th className="py-2">Notes</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {r.visits.map((v) => (
                                <tr key={v.id}>
                                  <td className="py-2 pr-3 font-semibold text-slate-700">{v.customerName}</td>
                                  <td className="py-2 pr-3">
                                    <StatusPill completed={v.completed} />
                                  </td>
                                  <td className="py-2 text-slate-500">{v.outcomeNotes || v.reasonIfNotCompleted || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                  {pagedHistory.length === 0 && <p className="text-xs text-slate-400 px-4 py-4">No matching reports found.</p>}
                </div>
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                  <span className="text-[10px] text-slate-400">
                    Page {historyPageClamped} of {historyTotalPages}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={historyPageClamped <= 1}
                      onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                      className="w-7 h-7 rounded-full border border-slate-200 text-slate-500 inline-flex items-center justify-center disabled:opacity-40 hover:bg-slate-50 transition"
                    >
                      <ChevronDown size={13} className="rotate-90" />
                    </button>
                    <button
                      type="button"
                      disabled={historyPageClamped >= historyTotalPages}
                      onClick={() => setHistoryPage((p) => Math.min(historyTotalPages, p + 1))}
                      className="w-7 h-7 rounded-full border border-slate-200 text-slate-500 inline-flex items-center justify-center disabled:opacity-40 hover:bg-slate-50 transition"
                    >
                      <ChevronDown size={13} className="-rotate-90" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Save Button (mobile-friendly quick access) */}
      <button
        type="button"
        disabled={savingId === 'all'}
        onClick={handleSaveAll}
        className="fixed bottom-5 right-5 z-20 inline-flex items-center gap-2 px-5 py-3 bg-emerald-700 text-white rounded-full text-sm font-bold shadow-lg hover:bg-emerald-800 transition disabled:opacity-50"
      >
        {savingId === 'all' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        Save
      </button>
    </div>
  );
};

export default DailyVisitingReport;