// src/Pages/modules/sales/roles/KAM/WeeklySalesPlan.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Trash2, Send, Save } from 'lucide-react';
import { useAuth } from '../../../../../Components/hooks/useAuth';
import { useToast } from '../../../../../Components/hooks/useToast';
import { DAYS_OF_WEEK, VISIT_SECTIONS, getWeekStart, buildEmptyVisit, WEEKLY_PLAN_STATUS } from '../../constants/weeklyPlanStatus';
import { listPlansForKam, savePlan, submitPlan } from '../../services/weeklyPlanService';
import { isRequired } from '../../../../../Components/utils/validators';

const buildEmptyPlan = (currentUser) => ({
  id: `plan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  kamId: currentUser?.id,
  kamName: currentUser?.name,
  weekStartDate: getWeekStart(),
  existingVisits: [],
  prospectVisits: [],
  status: WEEKLY_PLAN_STATUS.DRAFT,
  lmComments: '',
});

const VisitRow = ({ visit, onChange, onRemove }) => (
  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start bg-slate-50 border border-slate-200 rounded-lg p-3">
    <select
      className="sm:col-span-2 border border-slate-200 p-2 rounded text-xs bg-white outline-none focus:border-emerald-500"
      value={visit.day}
      onChange={(e) => onChange({ ...visit, day: e.target.value })}
    >
      {DAYS_OF_WEEK.map((d) => (
        <option key={d} value={d}>{d}</option>
      ))}
    </select>
    <input
      className="sm:col-span-3 border border-slate-200 p-2 rounded text-xs outline-none focus:border-emerald-500"
      placeholder="Customer name"
      value={visit.customerName}
      maxLength={200}
      onChange={(e) => onChange({ ...visit, customerName: e.target.value })}
    />
    <input
      className="sm:col-span-3 border border-slate-200 p-2 rounded text-xs outline-none focus:border-emerald-500"
      placeholder="Purpose of visit"
      value={visit.purpose}
      maxLength={300}
      onChange={(e) => onChange({ ...visit, purpose: e.target.value })}
    />
    <input
      className="sm:col-span-3 border border-slate-200 p-2 rounded text-xs outline-none focus:border-emerald-500"
      placeholder="Outcome / notes (after visit)"
      value={visit.outcomeNotes}
      maxLength={500}
      onChange={(e) => onChange({ ...visit, outcomeNotes: e.target.value })}
    />
    <button type="button" onClick={onRemove} className="sm:col-span-1 text-slate-300 hover:text-red-500 transition self-center">
      <Trash2 size={14} />
    </button>
  </div>
);

const WeeklySalesPlan = () => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const [plan, setPlan] = useState(() => buildEmptyPlan(currentUser));
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (!currentUser?.id) return;
    const plans = listPlansForKam(currentUser.id);
    const currentWeek = getWeekStart();
    const existingForWeek = plans.find((p) => p.weekStartDate === currentWeek);
    if (existingForWeek) setPlan(existingForWeek);
    setHistory(plans.filter((p) => p.weekStartDate !== currentWeek));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const isLocked = plan.status === WEEKLY_PLAN_STATUS.SUBMITTED || plan.status === WEEKLY_PLAN_STATUS.APPROVED;

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

  const handleSaveDraft = () => {
    const saved = savePlan(plan);
    if (saved) {
      setPlan(saved);
      showToast('Weekly plan saved as draft', 'success');
    } else {
      showToast('Failed to save plan', 'error');
    }
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const saved = savePlan(plan);
    if (!saved) return showToast('Failed to save plan', 'error');
    const submitted = submitPlan(saved.id);
    if (submitted) {
      setPlan(submitted);
      showToast('Weekly plan submitted for Line Manager review', 'success');
    }
  };

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
          {plan.status}
        </span>
      </div>

      {plan.lmComments && (
        <div className="bg-red-50 border border-red-100 rounded-lg p-4 text-sm text-red-700">
          <strong>Line Manager feedback:</strong> {plan.lmComments}
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-slate-800">Existing Client Visits</h3>
          {!isLocked && (
            <button type="button" onClick={() => addVisit(VISIT_SECTIONS.EXISTING)} className="text-xs font-bold text-emerald-700 flex items-center hover:text-emerald-800">
              <Plus size={14} className="mr-1" /> Add Visit
            </button>
          )}
        </div>
        <div className="space-y-3">
          {plan.existingVisits.length === 0 ? (
            <p className="text-xs text-slate-400">No existing-client visits planned yet.</p>
          ) : (
            plan.existingVisits.map((v) => (
              <VisitRow
                key={v.id}
                visit={v}
                onChange={(updated) => updateVisit(VISIT_SECTIONS.EXISTING, v.id, updated)}
                onRemove={() => removeVisit(VISIT_SECTIONS.EXISTING, v.id)}
              />
            ))
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-slate-800">Prospect Client Visits</h3>
          {!isLocked && (
            <button type="button" onClick={() => addVisit(VISIT_SECTIONS.PROSPECT)} className="text-xs font-bold text-emerald-700 flex items-center hover:text-emerald-800">
              <Plus size={14} className="mr-1" /> Add Visit
            </button>
          )}
        </div>
        <div className="space-y-3">
          {plan.prospectVisits.length === 0 ? (
            <p className="text-xs text-slate-400">No prospect visits planned yet.</p>
          ) : (
            plan.prospectVisits.map((v) => (
              <VisitRow
                key={v.id}
                visit={v}
                onChange={(updated) => updateVisit(VISIT_SECTIONS.PROSPECT, v.id, updated)}
                onRemove={() => removeVisit(VISIT_SECTIONS.PROSPECT, v.id)}
              />
            ))
          )}
        </div>
      </div>

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

      {history.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-4 text-sm">Previous Weeks</h3>
          <div className="space-y-2">
            {history.map((p) => (
              <div key={p.id} className="flex justify-between items-center text-xs border-b border-slate-100 pb-2">
                <span className="text-slate-600">Week of {p.weekStartDate}</span>
                <span className="font-bold text-slate-500">{p.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklySalesPlan;