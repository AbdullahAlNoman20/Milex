// admin/src/Pages/modules/sales/roles/KAM/DailyVisitingReport.jsx — REPLACE ENTIRE FILE
import React, { useState, useCallback, useEffect } from 'react';
import { Plus, Trash2, Send, History, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '../../../../../Components/hooks/useToast';
import { getReportByDate, saveReport, listMyReports } from '../../services/dailyReportService';
import { isRequired } from '../../../../../Components/utils/validators';
import Loader from '../../../../../Components/Shared/Loader';

const todayISO = () => new Date().toISOString().slice(0, 10);

const buildEmptyEntry = () => ({
  id: `e_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  customerName: '',
  completed: true,
  reasonIfNotCompleted: '',
  outcomeNotes: '',
});

const DailyVisitingReport = () => {
  const { showToast } = useToast();
  const [date, setDate] = useState(todayISO());
  const [visits, setVisits] = useState([buildEmptyEntry()]);
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [expandedReportId, setExpandedReportId] = useState(null);

  const loadHistory = useCallback(() => {
    listMyReports()
      .then((reports) => setHistory(reports.filter((r) => r.date !== todayISO())))
      .catch(() => setHistory([]));
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const loadForDate = useCallback(async (targetDate) => {
    setIsLoading(true);
    try {
      const existing = await getReportByDate(targetDate);
      setVisits(existing?.visits?.length ? existing.visits : [buildEmptyEntry()]);
      setSubmitted(!!existing);
    } catch {
      setVisits([buildEmptyEntry()]);
      setSubmitted(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadForDate(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDateChange = (newDate) => {
    setDate(newDate);
    loadForDate(newDate);
  };

  const updateVisit = (id, updated) => setVisits((prev) => prev.map((v) => (v.id === id ? updated : v)));
  const removeVisit = (id) => setVisits((prev) => prev.filter((v) => v.id !== id));
  const addVisit = () => setVisits((prev) => [...prev, buildEmptyEntry()]);

  const handleSubmit = async () => {
    if (visits.length === 0) return showToast('Add at least one visit entry', 'warning');
    const invalid = visits.find(
      (v) => !isRequired(v.customerName) || (!v.completed && !isRequired(v.reasonIfNotCompleted))
    );
    if (invalid) {
      return showToast(
        'Every visit needs a customer name; incomplete visits require a reason before submission',
        'warning'
      );
    }
    try {
      const saved = await saveReport({ date, visits });
      setVisits(saved.visits);
      setSubmitted(true);
      showToast('Daily visiting report submitted', 'success');
      loadHistory();
    } catch (err) {
      showToast(err?.message || 'Failed to submit report', 'error');
    }
  };

  if (isLoading) return <Loader fullScreen label="Loading report..." />;

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

      {submitted && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-xs text-emerald-700 font-semibold">
          A report for this date has already been submitted. Edits here will update it.
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
        {visits.map((v) => (
          <div key={v.id} className="border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                className="border border-slate-200 p-2.5 rounded text-sm outline-none focus:border-emerald-500"
                placeholder="Customer name"
                value={v.customerName}
                maxLength={200}
                onChange={(e) => updateVisit(v.id, { ...v, customerName: e.target.value })}
              />
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={v.completed}
                  onChange={(e) => updateVisit(v.id, { ...v, completed: e.target.checked, reasonIfNotCompleted: e.target.checked ? '' : v.reasonIfNotCompleted })}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                Visit completed
              </label>
            </div>
            {!v.completed && (
              <textarea
                className="w-full border border-red-200 p-2.5 rounded text-sm outline-none focus:border-red-500 min-h-[60px]"
                placeholder="Reason visit was not completed (required)"
                value={v.reasonIfNotCompleted}
                maxLength={500}
                onChange={(e) => updateVisit(v.id, { ...v, reasonIfNotCompleted: e.target.value })}
              />
            )}
            <textarea
              className="w-full border border-slate-200 p-2.5 rounded text-sm outline-none focus:border-emerald-500 min-h-[60px]"
              placeholder="Visit outcome / notes"
              value={v.outcomeNotes}
              maxLength={500}
              onChange={(e) => updateVisit(v.id, { ...v, outcomeNotes: e.target.value })}
            />
            <button type="button" onClick={() => removeVisit(v.id)} className="text-xs text-red-500 font-bold flex items-center hover:text-red-700">
              <Trash2 size={14} className="mr-1" /> Remove
            </button>
          </div>
        ))}
        <button type="button" onClick={addVisit} className="text-sm font-bold text-emerald-700 flex items-center hover:text-emerald-800 transition">
          <Plus size={16} className="mr-1" /> Add Visit Entry
        </button>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          className="px-6 py-2.5 bg-emerald-700 text-white rounded-lg text-sm font-bold flex items-center shadow-md hover:bg-emerald-800 transition"
        >
          <Send size={16} className="mr-2" /> {submitted ? 'Update Report' : 'Submit Report'}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <button
          type="button"
          onClick={() => setIsHistoryOpen((o) => !o)}
          className="w-full flex justify-between items-center p-5 text-left"
        >
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