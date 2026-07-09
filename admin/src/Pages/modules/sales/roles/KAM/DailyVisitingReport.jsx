// src/Pages/modules/sales/roles/KAM/DailyVisitingReport.jsx
import React, { useState, useCallback } from 'react';
import { Plus, Trash2, Send } from 'lucide-react';
import { useAuth } from '../../../../../Components/hooks/useAuth';
import { useToast } from '../../../../../Components/hooks/useToast';
import { getReportByDate, saveReport } from '../../services/dailyReportService';
import { isRequired } from '../../../../../Components/utils/validators';

const todayISO = () => new Date().toISOString().slice(0, 10);

const buildEmptyEntry = () => ({
  id: `e_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  customerName: '',
  completed: true,
  reasonIfNotCompleted: '',
  outcomeNotes: '',
});

const DailyVisitingReport = () => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const [date, setDate] = useState(todayISO());
  const [visits, setVisits] = useState(() => {
    const existing = getReportByDate(currentUser?.id, todayISO());
    return existing?.visits?.length ? existing.visits : [buildEmptyEntry()];
  });
  const [submitted, setSubmitted] = useState(!!getReportByDate(currentUser?.id, todayISO()));

  const handleDateChange = useCallback(
    (newDate) => {
      setDate(newDate);
      const existing = getReportByDate(currentUser?.id, newDate);
      setVisits(existing?.visits?.length ? existing.visits : [buildEmptyEntry()]);
      setSubmitted(!!existing);
    },
    [currentUser]
  );

  const updateVisit = (id, updated) => setVisits((prev) => prev.map((v) => (v.id === id ? updated : v)));
  const removeVisit = (id) => setVisits((prev) => prev.filter((v) => v.id !== id));
  const addVisit = () => setVisits((prev) => [...prev, buildEmptyEntry()]);

  const handleSubmit = () => {
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
    const saved = saveReport({
      id: `report_${currentUser?.id}_${date}`,
      kamId: currentUser?.id,
      kamName: currentUser?.name,
      date,
      visits,
    });
    if (saved) {
      setSubmitted(true);
      showToast('Daily visiting report submitted', 'success');
    } else {
      showToast('Failed to submit report', 'error');
    }
  };

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
    </div>
  );
};

export default DailyVisitingReport;