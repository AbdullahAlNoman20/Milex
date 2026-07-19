// admin/src/Pages/modules/sales/roles/KAM/DailyVisitingReport.jsx 
import { useState, useCallback, useEffect } from 'react';
import { Plus, Trash2, CheckCircle2, XCircle, History, ChevronDown, ChevronUp, Loader2, Lock } from 'lucide-react';
import { useToast } from '../../../../../Components/hooks/useToast';
import { getReportByDate, saveReport, listMyReports } from '../../services/dailyReportService';

const todayISO = () => new Date().toISOString().slice(0, 10);

const buildEmptyEntry = () => ({
  id: `e_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  customerName: '',
  completed: null,
  reasonIfNotCompleted: '',
  outcomeNotes: '',
  sourceVisitId: null,
});

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
      setVisits(
        existing?.visits?.length
          ? existing.visits.map((v) => ({ ...v, reasonIfNotCompleted: v.reasonIfNotCompleted || '', outcomeNotes: v.outcomeNotes || '' }))
          : [buildEmptyEntry()]
      );
    } catch {
      setVisits([buildEmptyEntry()]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadForDate(date);
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const handleDateChange = (newDate) => setDate(newDate);

  const updateLocal = (id, updated) => setVisits((prev) => prev.map((v) => (v.id === id ? updated : v)));
  const addVisit = () => setVisits((prev) => [...prev, buildEmptyEntry()]);
  const removeVisit = (id) => setVisits((prev) => prev.filter((v) => v.id !== id));

  const persist = useCallback(
    async (nextVisits, id) => {
      setSavingId(id);
      try {
        const saved = await saveReport({ date, visits: nextVisits });
        setVisits(saved.visits.map((v) => ({ ...v, reasonIfNotCompleted: v.reasonIfNotCompleted || '', outcomeNotes: v.outcomeNotes || '' })));
        loadHistory();
      } catch (err) {
        showToast(err?.message || 'Failed to save', 'error');
      } finally {
        setSavingId(null);
      }
    },
    [date, showToast, loadHistory]
  );

  const handleDone = (v) => {
    if (!v.customerName.trim()) return showToast('Enter a customer name first', 'warning');
    const updated = { ...v, completed: true, reasonIfNotCompleted: '' };
    updateLocal(v.id, updated);
    persist(visits.map((r) => (r.id === v.id ? updated : r)), v.id);
  };

  const handleSkip = (v) => {
    if (!v.customerName.trim()) return showToast('Enter a customer name first', 'warning');
    updateLocal(v.id, { ...v, completed: false });
  };

  const handleReasonBlur = (v) => {
    if (v.completed !== false || !v.reasonIfNotCompleted?.trim()) return;
    persist(visits.map((r) => (r.id === v.id ? v : r)), v.id);
  };

  const handleOutcomeBlur = (v) => {
    if (v.completed === null || !v.customerName.trim()) return;
    persist(visits.map((r) => (r.id === v.id ? v : r)), v.id);
  };

  if (isLoading) return <div className="text-center py-16 text-sm text-slate-400">Loading report...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h2 className="text-2xl font-bold text-slate-800">Daily Sales Visiting Report</h2>
        <input
          type="date"
          max={todayISO()}
          value={date}
          onChange={(e) => handleDateChange(e.target.value)}
          className="border border-slate-200 p-2 rounded-lg text-sm outline-none focus:border-emerald-500"
        />
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
        {visits.map((v) => {
          const fromPlan = !!v.sourceVisitId;
          return (
            <div key={v.id} className="border border-slate-200 rounded-lg p-4 space-y-3 relative">
              {savingId === v.id && (
                <span className="absolute top-3 right-3 text-slate-400"><Loader2 size={14} className="animate-spin" /></span>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Customer Name {fromPlan && <Lock size={10} />}
                  </label>
                  <input
                    disabled={fromPlan}
                    className={`w-full border p-2.5 rounded text-sm outline-none focus:border-emerald-500 ${fromPlan ? 'bg-slate-50 text-slate-500 border-slate-100' : 'bg-white border-slate-200'}`}
                    placeholder="Customer name"
                    value={v.customerName}
                    maxLength={200}
                    onChange={(e) => updateLocal(v.id, { ...v, customerName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Purpose {fromPlan && <Lock size={10} />}
                  </label>
                  <input
                    disabled={fromPlan}
                    className={`w-full border p-2.5 rounded text-sm outline-none ${fromPlan ? 'bg-slate-50 text-slate-500 border-slate-100' : 'bg-white border-slate-200'}`}
                    value={fromPlan ? v.purpose : ''}
                    readOnly
                    placeholder={fromPlan ? '' : 'Set from Weekly Plan'}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleDone(v)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${v.completed === true ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                  <CheckCircle2 size={14} /> Done
                </button>
                <button
                  type="button"
                  onClick={() => handleSkip(v)}
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
                    placeholder="Reason visit was not completed"
                    value={v.reasonIfNotCompleted}
                    maxLength={500}
                    onChange={(e) => updateLocal(v.id, { ...v, reasonIfNotCompleted: e.target.value })}
                    onBlur={() => handleReasonBlur(visits.find((r) => r.id === v.id))}
                  />
                </div>
              )}

              {v.completed === true && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Visit Outcome / Notes</label>
                  <textarea
                    className="w-full border border-slate-200 p-2.5 rounded text-sm outline-none focus:border-emerald-500 min-h-[60px]"
                    placeholder="Visit outcome / notes"
                    value={v.outcomeNotes}
                    maxLength={500}
                    onChange={(e) => updateLocal(v.id, { ...v, outcomeNotes: e.target.value })}
                    onBlur={() => handleOutcomeBlur(visits.find((r) => r.id === v.id))}
                  />
                </div>
              )}

              {!fromPlan && (
                <button type="button" onClick={() => removeVisit(v.id)} className="text-xs text-red-500 font-bold flex items-center hover:text-red-700">
                  <Trash2 size={14} className="mr-1" /> Remove
                </button>
              )}
            </div>
          );
        })}
        <button type="button" onClick={addVisit} className="text-sm font-bold text-emerald-700 flex items-center hover:text-emerald-800 transition">
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
                                <span className={`font-bold ${v.completed ? 'text-emerald-600' : 'text-red-500'}`}>
                                  {v.completed ? 'Completed' : 'Not Completed'}
                                </span>
                              </td>
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