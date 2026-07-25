// FILE: admin/src/Pages/modules/sales/roles/KAM/DailyVisitingReport.jsx
import { useState, useCallback, useEffect } from 'react';
import { Plus, Trash2, CheckCircle2, XCircle, History, ChevronDown, ChevronUp, Loader2, Lock, Save, Pencil } from 'lucide-react';
import { useToast } from '../../../../../Components/hooks/useToast';
import { getReportByDate, saveReport, listMyReports } from '../../services/dailyReportService';
import { todayLocalISO as todayISO } from '../../../../../Components/utils/date';

const buildManualEntry = () => ({
  id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  customerName: '',
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
  reasonIfNotCompleted: v.reasonIfNotCompleted || '',
  outcomeNotes: v.outcomeNotes || '',
  purpose: v.purpose || '',
  isManual: !v.sourceVisitId,
  locked: !!v.id && !String(v.id).startsWith('m_') && !String(v.id).startsWith('plan_'),
});

const StatusPill = ({ completed }) => {
  if (completed === true) return <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">Completed</span>;
  if (completed === false) return <span className="text-[10px] font-bold uppercase tracking-wide text-red-600 bg-red-100 px-2 py-0.5 rounded-full">Skipped</span>;
  return <span className="text-[10px] font-bold uppercase tracking-wide text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">Not Decided</span>;
};

const VisitRow = ({ v, savingId, onUpdate, onSave, onUnlock, onRemove }) => {
  const isSaving = savingId === v.id;

  if (v.locked) {
    return (
      <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-800 truncate">{v.customerName || '(no name)'}</p>
            {v.purpose && <p className="text-xs text-slate-400 mt-0.5">{v.purpose}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <StatusPill completed={v.completed} />
            <button type="button" onClick={() => onUnlock(v.id)} className="text-slate-400 hover:text-emerald-600 transition inline-flex items-center gap-1 text-xs font-bold">
              <Pencil size={12} /> Edit
            </button>
          </div>
        </div>
        {v.completed === false && v.reasonIfNotCompleted && (
          <p className="text-xs text-red-600 mt-2"><span className="font-bold">Reason:</span> {v.reasonIfNotCompleted}</p>
        )}
        {v.outcomeNotes && (
          <p className="text-xs text-slate-500 mt-2"><span className="font-bold text-slate-600">Notes:</span> {v.outcomeNotes}</p>
        )}
      </div>
    );
  }

  return (
    <div className="border border-slate-200 rounded-xl p-4 space-y-3 relative">
      {isSaving && <span className="absolute top-3 right-3 text-slate-400"><Loader2 size={14} className="animate-spin" /></span>}

      {v.isManual ? (
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Customer Name</label>
          <input
            className="w-full border p-2.5 rounded text-sm outline-none focus:border-emerald-500 bg-white border-slate-200"
            placeholder="Customer name"
            value={v.customerName}
            maxLength={200}
            onChange={(e) => onUpdate({ ...v, customerName: e.target.value })}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase mb-1">
              Customer Name <Lock size={10} />
            </label>
            <input disabled className="w-full border p-2.5 rounded text-sm outline-none bg-slate-50 text-slate-500 border-slate-100" value={v.customerName} />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase mb-1">
              Purpose <Lock size={10} />
            </label>
            <input disabled className="w-full border p-2.5 rounded text-sm outline-none bg-slate-50 text-slate-500 border-slate-100" value={v.purpose} />
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onUpdate({ ...v, completed: true })}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${v.completed === true ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
        >
          <CheckCircle2 size={14} /> Done
        </button>
        <button
          type="button"
          onClick={() => onUpdate({ ...v, completed: false })}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${v.completed === false ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
        >
          <XCircle size={14} /> Skip
        </button>
      </div>

      {v.completed === false && (
        <div>
          <label className="block text-[10px] font-bold text-red-500 uppercase mb-1">Reason for Skip</label>
          <textarea
            className="w-full border border-red-200 p-2.5 rounded text-sm outline-none focus:border-red-500 min-h-[60px]"
            placeholder="Why wasn't this visit completed?"
            value={v.reasonIfNotCompleted}
            maxLength={500}
            onChange={(e) => onUpdate({ ...v, reasonIfNotCompleted: e.target.value })}
          />
        </div>
      )}

      <div>
        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Outcome / Notes</label>
        <textarea
          className="w-full border border-slate-200 p-2.5 rounded text-sm outline-none focus:border-emerald-500 min-h-[60px]"
          placeholder="Visit outcome / notes (optional)"
          value={v.outcomeNotes}
          maxLength={500}
          onChange={(e) => onUpdate({ ...v, outcomeNotes: e.target.value })}
        />
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={() => onSave(v)} className="flex-1 py-2 rounded-lg text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 transition flex items-center justify-center gap-1.5">
          <Save size={14} /> Save
        </button>
        {v.isManual && (
          <button type="button" onClick={() => onRemove(v.id)} className="px-3 text-slate-400 hover:text-red-500 transition" aria-label="Remove visit">
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

const DailyVisitingReport = () => {
  const { showToast } = useToast();
  const [date, setDate] = useState(todayISO());
  const [visits, setVisits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [history, setHistory] = useState([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [expandedReportId, setExpandedReportId] = useState(null);

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

  if (isLoading) return <div className="text-center py-16 text-sm text-slate-400">Loading report...</div>;

  const planVisits = visits.filter((v) => !v.isManual);
  const manualVisits = visits.filter((v) => v.isManual);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Daily Sales Visiting Report</h2>
          <p className="text-sm text-slate-500 mt-1">Mark today's scheduled visits Done or Skipped, and log any extra visits.</p>
        </div>
        <input
          type="date"
          max={todayISO()}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border border-slate-200 p-2 rounded-lg text-sm outline-none focus:border-emerald-500"
        />
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Scheduled Visits (from Weekly Plan)</h3>
        {planVisits.length === 0 ? (
          <p className="text-xs text-slate-400">No visits scheduled from your Weekly Plan for this date.</p>
        ) : (
          planVisits.map((v) => (
            <VisitRow key={v.id} v={v} savingId={savingId} onUpdate={(updated) => updateLocal(v.id, updated)} onSave={handleSaveRow} onUnlock={unlockRow} onRemove={removeVisit} />
          ))
        )}
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Additional Visits (not in Weekly Plan)</h3>
        {manualVisits.map((v) => (
          <VisitRow key={v.id} v={v} savingId={savingId} onUpdate={(updated) => updateLocal(v.id, updated)} onSave={handleSaveRow} onUnlock={unlockRow} onRemove={removeVisit} />
        ))}
        <button type="button" onClick={addManualVisit} className="text-sm font-bold text-emerald-700 flex items-center hover:text-emerald-800 transition">
          <Plus size={16} className="mr-1" /> Add Visit Entry
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <button type="button" onClick={() => setIsHistoryOpen((o) => !o)} className="w-full flex justify-between items-center p-5 text-left">
          <h3 className="font-bold text-slate-800 text-sm flex items-center">
            <History size={16} className="mr-2 text-slate-400" /> My Report History ({history.length})
          </h3>
          {isHistoryOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </button>
        {isHistoryOpen && (
          <div className="border-t border-slate-100 divide-y divide-slate-100">
            {history.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No previous reports yet.</p>
            ) : (
              history.map((r) => (
                <div key={r.id}>
                  <button
                    type="button"
                    onClick={() => setExpandedReportId(expandedReportId === r.id ? null : r.id)}
                    className="w-full flex justify-between items-center px-5 py-3 text-left hover:bg-slate-50 transition"
                  >
                    <span className="text-xs font-bold text-slate-700">{r.date}</span>
                    <span className="text-[10px] text-slate-400">{r.visits.length} visit(s)</span>
                  </button>
                  {expandedReportId === r.id && (
                    <div className="px-5 pb-4 overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[560px]">
                        <thead>
                          <tr className="text-[10px] text-slate-400 font-bold uppercase tracking-wide border-b border-slate-200">
                            <th className="py-2 pr-3">Customer Name</th>
                            <th className="py-2 pr-3">Purpose</th>
                            <th className="py-2 pr-3">Status</th>
                            <th className="py-2 pr-3">Reason (if not completed)</th>
                            <th className="py-2">Outcome / Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {r.visits.map((v) => (
                            <tr key={v.id} className="text-xs align-top">
                              <td className="py-2.5 pr-3 font-semibold text-slate-700">{v.customerName}</td>
                              <td className="py-2.5 pr-3 text-slate-500">{v.purpose || '—'}</td>
                              <td className="py-2.5 pr-3"><StatusPill completed={v.completed} /></td>
                              <td className="py-2.5 pr-3 text-slate-500">{v.reasonIfNotCompleted || '—'}</td>
                              <td className="py-2.5 text-slate-500">{v.outcomeNotes || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyVisitingReport;