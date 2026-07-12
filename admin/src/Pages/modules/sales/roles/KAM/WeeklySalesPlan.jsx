// admin/src/Pages/modules/sales/roles/KAM/WeeklySalesPlan.jsx — REPLACE ENTIRE FILE
import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Send, Save, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '../../../../../Components/hooks/useToast';
import { DAYS_OF_WEEK, VISIT_SECTIONS, getWeekStart, getNextWeekStart, buildEmptyVisit, WEEKLY_PLAN_STATUS } from '../../constants/weeklyPlanStatus';
import { listPlansForKam, savePlan, submitPlan } from '../../services/weeklyPlanService';
import { isRequired } from '../../../../../Components/utils/validators';
import { humanizeStatus } from '../../../../../Components/utils/format';
import Loader from '../../../../../Components/Shared/Loader';

const buildEmptyPlan = (weekStartDate) => ({
  weekStartDate,
  existingVisits: [],
  prospectVisits: [],
  status: WEEKLY_PLAN_STATUS.DRAFT,
  lmComments: '',
});

const VisitTable = ({ title, visits, editable, onAdd, onChange, onRemove }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
    <div className="flex justify-between items-center">
      <h3 className="font-bold text-slate-800">{title}</h3>
      {editable && (
        <button type="button" onClick={onAdd} className="text-xs font-bold text-emerald-700 flex items-center hover:text-emerald-800">
          <Plus size={14} className="mr-1" /> Add Visit
        </button>
      )}
    </div>
    {visits.length === 0 ? (
      <p className="text-xs text-slate-400">No visits planned yet.</p>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[640px]">
          <thead>
            <tr className="text-[10px] text-slate-400 font-bold uppercase tracking-wide border-b border-slate-200">
              <th className="py-2 pr-3 w-28">Day</th>
              <th className="py-2 pr-3">Customer Name</th>
              <th className="py-2 pr-3">Purpose</th>
              <th className="py-2 pr-3">Outcome / Notes</th>
              {editable && <th className="py-2 w-10" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visits.map((v) =>
              editable ? (
                <tr key={v.id} className="align-top">
                  <td className="py-2 pr-3">
                    <select
                      className="w-full border border-slate-200 p-2 rounded text-xs bg-white outline-none focus:border-emerald-500"
                      value={v.day}
                      onChange={(e) => onChange({ ...v, day: e.target.value })}
                    >
                      {DAYS_OF_WEEK.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      className="w-full border border-slate-200 p-2 rounded text-xs outline-none focus:border-emerald-500"
                      placeholder="Customer name"
                      value={v.customerName}
                      maxLength={200}
                      onChange={(e) => onChange({ ...v, customerName: e.target.value })}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      className="w-full border border-slate-200 p-2 rounded text-xs outline-none focus:border-emerald-500"
                      placeholder="Purpose of visit"
                      value={v.purpose}
                      maxLength={300}
                      onChange={(e) => onChange({ ...v, purpose: e.target.value })}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      className="w-full border border-slate-200 p-2 rounded text-xs outline-none focus:border-emerald-500"
                      placeholder="Outcome / notes"
                      value={v.outcomeNotes}
                      maxLength={500}
                      onChange={(e) => onChange({ ...v, outcomeNotes: e.target.value })}
                    />
                  </td>
                  <td className="py-2 text-right">
                    <button type="button" onClick={onRemove} className="text-slate-300 hover:text-red-500 transition">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={v.id} className="text-xs align-top">
                  <td className="py-2.5 pr-3 font-bold text-slate-700">{v.day}</td>
                  <td className="py-2.5 pr-3 text-slate-700">{v.customerName}</td>
                  <td className="py-2.5 pr-3 text-slate-500">{v.purpose}</td>
                  <td className="py-2.5 text-slate-500">{v.outcomeNotes || '—'}</td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

const WeeklySalesPlan = () => {
  const { showToast } = useToast();
  const [plan, setPlan] = useState(buildEmptyPlan(getWeekStart()));
  const [approvedPlan, setApprovedPlan] = useState(null);
  const [history, setHistory] = useState([]);
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadPlans = useCallback(async () => {
    setIsLoading(true);
    try {
      const plans = await listPlansForKam();
      const currentWeek = getWeekStart();
      const nextWeek = getNextWeekStart();
      const currentWeekPlan = plans.find((p) => p.weekStartDate === currentWeek);

      if (currentWeekPlan && currentWeekPlan.status === WEEKLY_PLAN_STATUS.APPROVED) {
        // Current week is locked-in (approved) — show it read-only, and open
        // the editable area on next week's plan (existing draft or a new one).
        setApprovedPlan(currentWeekPlan);
        const nextWeekPlan = plans.find((p) => p.weekStartDate === nextWeek);
        setPlan(nextWeekPlan || buildEmptyPlan(nextWeek));
        setHistory(plans.filter((p) => p.weekStartDate !== currentWeek && p.weekStartDate !== nextWeek));
      } else {
        setApprovedPlan(null);
        setPlan(currentWeekPlan || buildEmptyPlan(currentWeek));
        setHistory(plans.filter((p) => p.weekStartDate !== currentWeek));
      }
    } catch (err) {
      showToast(err?.message || 'Failed to load weekly plans', 'error');
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const isLocked = plan.status === WEEKLY_PLAN_STATUS.SUBMITTED;

  const addVisit = (section) => {
    setPlan((prev) => ({
      ...prev,
      [section === VISIT_SECTIONS.EXISTING ? 'existingVisits' : 'prospectVisits']: [
        ...(section === VISIT_SECTIONS.EXISTING ? prev.existingVisits : prev.prospectVisits),
        buildEmptyVisit(),
      ],
    }));
  };

  const updateVisit = (section, id, updated) => {
    const key = section === VISIT_SECTIONS.EXISTING ? 'existingVisits' : 'prospectVisits';
    setPlan((prev) => ({ ...prev, [key]: prev[key].map((v) => (v.id === id ? updated : v)) }));
  };

  const removeVisit = (section, id) => {
    const key = section === VISIT_SECTIONS.EXISTING ? 'existingVisits' : 'prospectVisits';
    setPlan((prev) => ({ ...prev, [key]: prev[key].filter((v) => v.id !== id) }));
  };

  const validate = () => {
    const allVisits = [...plan.existingVisits, ...plan.prospectVisits];
    if (allVisits.length === 0) return showToast('Add at least one planned visit', 'warning'), false;
    const incomplete = allVisits.find((v) => !isRequired(v.customerName) || !isRequired(v.purpose));
    if (incomplete) return showToast('Every visit needs a customer name and purpose', 'warning'), false;
    return true;
  };

  const handleSaveDraft = async () => {
    try {
      const saved = await savePlan(plan);
      setPlan(saved);
      showToast('Weekly plan saved as draft', 'success');
    } catch (err) {
      showToast(err?.message || 'Failed to save plan', 'error');
    }
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      const saved = await savePlan(plan);
      const submittedPlan = await submitPlan(saved.weekStartDate);
      setPlan(submittedPlan);
      showToast('Weekly plan submitted for Line Manager review', 'success');
    } catch (err) {
      showToast(err?.message || 'Failed to submit plan', 'error');
    }
  };

  if (isLoading) return <Loader fullScreen label="Loading weekly plan..." />;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Weekly Sales Planning</h2>
          <p className="text-sm text-slate-500 mt-1">Week starting {plan.weekStartDate}</p>
        </div>
        <span
          className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide border ${
            plan.status === WEEKLY_PLAN_STATUS.APPROVED
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : plan.status === WEEKLY_PLAN_STATUS.NEEDS_REVISION
              ? 'bg-red-50 text-red-700 border-red-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}
        >
          {humanizeStatus(plan.status)}
        </span>
      </div>

      {plan.lmComments && (
        <div className="bg-red-50 border border-red-100 rounded-lg p-4 text-sm text-red-700">
          <strong>Line Manager feedback:</strong> {plan.lmComments}
        </div>
      )}

      {approvedPlan && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-xs text-emerald-700 font-semibold">
          Your plan for week of {approvedPlan.weekStartDate} is approved (shown below). You can now plan the
          upcoming week of {plan.weekStartDate} above.
        </div>
      )}

      <VisitTable
        title="Existing Client Visits"
        visits={plan.existingVisits}
        editable={!isLocked}
        onAdd={() => addVisit(VISIT_SECTIONS.EXISTING)}
        onChange={(updated) => updateVisit(VISIT_SECTIONS.EXISTING, updated.id, updated)}
        onRemove={(id) => removeVisit(VISIT_SECTIONS.EXISTING, id)}
      />

      <VisitTable
        title="Prospect Client Visits"
        visits={plan.prospectVisits}
        editable={!isLocked}
        onAdd={() => addVisit(VISIT_SECTIONS.PROSPECT)}
        onChange={(updated) => updateVisit(VISIT_SECTIONS.PROSPECT, updated.id, updated)}
        onRemove={(id) => removeVisit(VISIT_SECTIONS.PROSPECT, id)}
      />

      {!isLocked && (
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={handleSaveDraft}
            className="px-5 py-2.5 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 transition flex items-center"
          >
            <Save size={16} className="mr-2" /> Save Draft
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-6 py-2.5 bg-emerald-700 text-white rounded-lg text-sm font-bold flex items-center shadow-md hover:bg-emerald-800 transition"
          >
            <Send size={16} className="mr-2" /> Submit to Line Manager
          </button>
        </div>
      )}

      {approvedPlan && (
        <div className="bg-white rounded-xl shadow-sm border border-emerald-200">
          <div className="p-6 pb-2 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm">Approved Plan — Week of {approvedPlan.weekStartDate}</h3>
            <span className="text-[10px] font-bold uppercase text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded">
              {humanizeStatus(approvedPlan.status)}
            </span>
          </div>
          <div className="p-6 pt-2 space-y-4">
            <VisitTable title="Existing Client Visits" visits={approvedPlan.existingVisits} editable={false} />
            <VisitTable title="Prospect Client Visits" visits={approvedPlan.prospectVisits} editable={false} />
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-6 pb-2">
            <h3 className="font-bold text-slate-800 text-sm">My Weekly Plan History</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {history.map((p) => (
              <div key={p.id}>
                <button
                  type="button"
                  onClick={() => setExpandedHistoryId(expandedHistoryId === p.id ? null : p.id)}
                  className="w-full flex justify-between items-center px-6 py-3 text-left hover:bg-slate-50 transition"
                >
                  <span className="text-xs font-bold text-slate-700">Week of {p.weekStartDate}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase text-amber-600">{humanizeStatus(p.status)}</span>
                    {expandedHistoryId === p.id ? (
                      <ChevronUp size={14} className="text-slate-400" />
                    ) : (
                      <ChevronDown size={14} className="text-slate-400" />
                    )}
                  </span>
                </button>
                {expandedHistoryId === p.id && (
                  <div className="px-6 pb-5 space-y-4">
                    {p.lmComments && (
                      <p className="text-xs text-red-600"><strong>Feedback:</strong> {p.lmComments}</p>
                    )}
                    <VisitTable title="Existing Client Visits" visits={p.existingVisits} editable={false} />
                    <VisitTable title="Prospect Client Visits" visits={p.prospectVisits} editable={false} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklySalesPlan;