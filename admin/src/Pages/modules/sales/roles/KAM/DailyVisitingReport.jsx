// FILE: admin/src/Pages/modules/sales/roles/KAM/DailyVisitingReport.jsx
import { useState, useCallback, useEffect } from 'react';
import {
  Plus,
  CheckCircle2,
  XCircle,
  Loader2,
  Lock,
  Save,
  Pencil,
  CalendarRange,
} from 'lucide-react';
import { useToast } from '../../../../../Components/hooks/useToast';
import { getReportByDate, saveReport } from '../../services/dailyReportService';
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
  visitType: 'prospect',
  locked: false,
});

const normalize = (v) => ({
  ...v,
  customerId: v.customerId || null,
  reasonIfNotCompleted: v.reasonIfNotCompleted || '',
  outcomeNotes: v.outcomeNotes || '',
  purpose: v.purpose || '',
  isManual: !v.sourceVisitId,
  visitType: v.type || v.visitType || (v.customerId ? 'existing' : 'prospect'),
  // Backend fully replaces all rows on every save (new DB ids for everyone),
  // so id prefix can't tell us which rows were actually decided. A visit is
  // only "locked" once it truly has a completed/skipped decision recorded.
  locked: v.completed === true || v.completed === false,
});
const StatusPill = ({ completed }) => {
  if (completed === true)
    return (
      <span className="inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset bg-emerald-50 text-[#0D8A68] ring-emerald-100">
        Completed
      </span>
    );
  if (completed === false)
    return (
      <span className="inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset bg-slate-100 text-slate-500 ring-slate-200">
        Skipped
      </span>
    );
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset bg-slate-100 text-slate-600 ring-slate-200">
      Pending
    </span>
  );
};

const VisitCard = ({ v, savingId, onUpdate, onSave, onUnlock }) => {
  const isSaving = savingId === v.id;
  const isSkipped = v.completed === false;
  const isCompleted = v.completed === true;

  return (
    <div
      className={`border rounded-[12px] p-4 sm:p-5 ${
        v.locked && isSkipped ? 'bg-red-50 border-red-200' : 'bg-white border-[#E5E7EB]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {v.locked ? (
            <p className="text-sm font-semibold text-[#111827] break-words">{v.customerName || '(no name)'}</p>
          ) : v.isManual ? (
            <CustomerSearchSelect
              value={v.customerName}
              onSelect={({ customerName, customerId }) => onUpdate({ ...v, customerName, customerId })}
            />
          ) : (
            <div className="flex items-center gap-1.5">
              <input
                disabled
                className="w-full border border-[#E5E7EB] p-2 rounded-[12px] text-xs outline-none bg-slate-50 text-[#6B7280] font-medium"
                value={v.customerName}
              />
              <Lock size={11} className="text-slate-300 shrink-0" />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusPill completed={v.completed} />
          {v.locked && (
            <button
              type="button"
              onClick={() => onUnlock(v.id)}
              aria-label="Edit this visit"
              className="text-slate-300 hover:text-[#0D8A68] transition"
            >
              <Pencil size={13} />
            </button>
          )}
        </div>
      </div>

      {v.purpose && (
        <p className="text-xs text-[#6B7280] mt-2 break-words">
          <span className="font-medium text-[#111827]">Purpose: </span>
          {v.purpose}
        </p>
      )}

      {v.locked && isSkipped && v.reasonIfNotCompleted && (
        <p className="text-xs text-red-700 mt-2 break-words">
          <span className="font-medium text-red-800">Reason for Skipping: </span>
          {v.reasonIfNotCompleted}
        </p>
      )}

      {v.locked && isCompleted && v.outcomeNotes && (
        <p className="text-xs text-[#6B7280] mt-2 break-words">
          <span className="font-medium text-[#111827]">Outcome: </span>
          {v.outcomeNotes}
        </p>
      )}

      {!v.locked && (
        <>
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              type="button"
              onClick={() => onUpdate({ ...v, completed: true })}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-[12px] text-[11px] font-semibold transition ${
                isCompleted ? 'bg-[#059669] text-white' : 'bg-slate-100 text-[#6B7280] hover:bg-slate-200'
              }`}
            >
              <CheckCircle2 size={13} /> Complete Visit
            </button>
            <button
              type="button"
              onClick={() => onUpdate({ ...v, completed: false, outcomeNotes: '' })}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-[12px] text-[11px] font-semibold transition ${
                isSkipped ? 'bg-slate-600 text-white' : 'bg-slate-100 text-[#6B7280] hover:bg-slate-200'
              }`}
            >
              <XCircle size={13} /> Skip Visit
            </button>
          </div>

          <div
            className={`overflow-hidden transition-all duration-200 ease-out ${
              isSkipped ? 'max-h-40 opacity-100 mt-3' : 'max-h-0 opacity-0'
            }`}
          >
            <label className="text-[11px] font-semibold text-[#111827] mb-1 block">Reason for Skipping</label>
            <textarea
              className="w-full border border-[#E5E7EB] p-2.5 rounded-[12px] text-xs outline-none focus:border-slate-400 min-h-[64px] bg-white"
              placeholder="Reason for skip"
              value={v.reasonIfNotCompleted}
              maxLength={500}
              onChange={(e) => onUpdate({ ...v, reasonIfNotCompleted: e.target.value })}
            />
          </div>

          <div
            className={`overflow-hidden transition-all duration-200 ease-out ${
              isCompleted ? 'max-h-40 opacity-100 mt-3' : 'max-h-0 opacity-0'
            }`}
          >
            <label className="text-[11px] font-semibold text-[#111827] mb-1 block">Outcome</label>
            <textarea
              className="w-full border border-[#E5E7EB] p-2.5 rounded-[12px] text-xs outline-none focus:border-[#059669] min-h-[64px] bg-white"
              placeholder="Outcome / notes (optional)"
              value={v.outcomeNotes}
              maxLength={500}
              onChange={(e) => onUpdate({ ...v, outcomeNotes: e.target.value })}
            />
            <p className="text-[10px] text-[#6B7280] mt-1 text-right">{v.outcomeNotes.length}/500</p>
          </div>

          <div className="flex items-center justify-end pt-3 mt-1 border-t border-[#E5E7EB]">
            {isSaving ? (
              <Loader2 size={14} className="animate-spin text-slate-400" />
            ) : (
              <button
                type="button"
                onClick={() => onSave(v)}
                aria-label="Save this visit"
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#0D8A68] hover:text-[#059669] transition"
              >
                <Save size={13} /> Save
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const DailyVisitingReport = () => {
  const { showToast } = useToast();
  const [date, setDate] = useState(todayISO());
  const [visits, setVisits] = useState([]);
  const [savedVisits, setSavedVisits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  const loadForDate = useCallback(async (targetDate) => {
    setIsLoading(true);
    try {
      const existing = await getReportByDate(targetDate);
      const normalized = existing?.visits?.length ? existing.visits.map(normalize) : [];
      setVisits(normalized);
      setSavedVisits(normalized);
    } catch {
      setVisits([]);
      setSavedVisits([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadForDate(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const updateLocal = (id, updated) => setVisits((prev) => prev.map((v) => (v.id === id ? updated : v)));
  const addManualVisit = () => setVisits((prev) => [...prev, buildManualEntry()]);

   const persist = useCallback(
    async (nextVisits, id) => {
      setSavingId(id);
      try {
        const saved = await saveReport({ date, visits: nextVisits });
        const normalized = saved.visits.map(normalize);
        setVisits(normalized);
        setSavedVisits(normalized);
        showToast('Report saved', 'success');
      } catch (err) {
        showToast(err?.message || 'Failed to save', 'error');
      } finally {
        setSavingId(null);
      }
    },
    [date, showToast]
  );

  const unlockRow = (id) => setVisits((prev) => prev.map((v) => (v.id === id ? { ...v, locked: false } : v)));

  const handleSaveRow = (v) => {
    if (!v.customerName.trim()) return showToast('Enter a customer name first', 'warning');
    if (v.completed === false && !v.reasonIfNotCompleted.trim()) {
      return showToast('Enter a reason for skipping this visit', 'warning');
    }
    // Only this row's edit is applied on top of the last-saved baseline,
    // so unsaved edits sitting in other pending rows are never persisted.
    const baseline = savedVisits.some((r) => r.id === v.id)
      ? savedVisits.map((r) => (r.id === v.id ? v : r))
      : [...savedVisits, v];
    persist(baseline, v.id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-[#6B7280] gap-2 bg-[#F8F9FA] min-h-screen">
        <Loader2 size={16} className="animate-spin" /> Loading report...
      </div>
    );
  }

  const existingVisits = visits.filter((v) => v.visitType === 'existing');
  const prospectVisits = visits.filter((v) => v.visitType === 'prospect');

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-8">
      <div className="max-w-[1100px] mx-auto px-4 md:px-6 py-5 md:py-8 space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-lg md:text-xl font-bold text-[#111827]">Daily Visiting Report</h1>
            <p className="text-xs text-[#6B7280] mt-0.5">Track and update today's customer visits</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#111827] border border-[#E5E7EB] bg-white px-3 py-2.5 rounded-[12px] cursor-pointer">
              <CalendarRange size={14} className="text-[#6B7280]" />
              <input
                type="date"
                max={todayISO()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="outline-none bg-transparent"
              />
            </label>
            <span className="inline-flex items-center whitespace-nowrap rounded-full px-3 py-2 text-[11px] font-bold bg-[#059669] text-white">
              {visits.length} {visits.length === 1 ? 'VISIT' : 'VISITS'}
            </span>
          </div>
        </div>

        {/* Existing Client Visits */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wide text-[#111827]">Existing Client Visits</h2>
          {existingVisits.length === 0 ? (
            <div className="bg-white border border-[#E5E7EB] rounded-[12px] px-5 py-6 text-center text-xs text-[#6B7280]">
              No existing client visits for this date.
            </div>
          ) : (
            existingVisits.map((v) => (
              <VisitCard
                key={v.id}
                v={v}
                savingId={savingId}
                onUpdate={(updated) => updateLocal(v.id, updated)}
                onSave={handleSaveRow}
                onUnlock={unlockRow}
              />
            ))
          )}
        </div>

        {/* Prospect Client Visits */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wide text-[#111827]">Prospect Client Visits</h2>
          {prospectVisits.length === 0 ? (
            <div className="bg-white border border-[#E5E7EB] rounded-[12px] px-5 py-6 text-center text-xs text-[#6B7280]">
              No prospect client visits added yet.
            </div>
          ) : (
            prospectVisits.map((v) => (
              <VisitCard
                key={v.id}
                v={v}
                savingId={savingId}
                onUpdate={(updated) => updateLocal(v.id, updated)}
                onSave={handleSaveRow}
                onUnlock={unlockRow}
              />
            ))
          )}

          <button
            type="button"
            onClick={addManualVisit}
            className="w-full inline-flex items-center justify-center gap-1.5 border border-dashed border-[#E5E7EB] text-[#0D8A68] rounded-[12px] px-4 py-3 text-xs font-bold hover:bg-emerald-50/50 transition"
          >
            <Plus size={14} /> ADD VISIT
          </button>
        </div>
      </div>
    </div>
  );
};

export default DailyVisitingReport;