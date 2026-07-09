// src/Pages/modules/sales/roles/LineManager/WeeklyPlanReviewList.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '../../../../../Components/hooks/useToast';
import { listPlansForReview, reviewPlan } from '../../services/weeklyPlanService';

const WeeklyPlanReviewList = () => {
  const { showToast } = useToast();
  const [plans, setPlans] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [comments, setComments] = useState({});

  const refresh = useCallback(() => setPlans(listPlansForReview()), []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleReview = (id, approved) => {
    const result = reviewPlan(id, { approved, comments: comments[id] || '' });
    if (result) {
      showToast(approved ? 'Plan approved' : 'Feedback sent to KAM for revision', 'success');
      refresh();
    } else {
      showToast('Failed to update plan', 'error');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      <h2 className="text-2xl font-bold text-slate-800">Weekly Plan Review</h2>

      {plans.length === 0 ? (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center text-slate-400">
          No weekly plans pending review.
        </div>
      ) : (
        plans.map((p) => (
          <div key={p.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
              className="w-full flex justify-between items-center p-5 text-left hover:bg-slate-50 transition"
            >
              <div>
                <p className="font-bold text-slate-800">{p.kamName}</p>
                <p className="text-xs text-slate-500">Week of {p.weekStartDate}</p>
              </div>
              <span className="text-xs font-bold text-amber-600">{p.status}</span>
            </button>
            {expandedId === p.id && (
              <div className="p-5 border-t border-slate-100 space-y-5">
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Existing Client Visits</h4>
                  {p.existingVisits.length === 0 ? (
                    <p className="text-xs text-slate-400">None planned.</p>
                  ) : (
                    <div className="space-y-1 text-xs">
                      {p.existingVisits.map((v) => (
                        <div key={v.id} className="flex gap-3 bg-slate-50 p-2 rounded">
                          <span className="font-bold w-20 shrink-0">{v.day}</span>
                          <span className="flex-1">{v.customerName} — {v.purpose}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Prospect Client Visits</h4>
                  {p.prospectVisits.length === 0 ? (
                    <p className="text-xs text-slate-400">None planned.</p>
                  ) : (
                    <div className="space-y-1 text-xs">
                      {p.prospectVisits.map((v) => (
                        <div key={v.id} className="flex gap-3 bg-slate-50 p-2 rounded">
                          <span className="font-bold w-20 shrink-0">{v.day}</span>
                          <span className="flex-1">{v.customerName} — {v.purpose}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <textarea
                  className="w-full border border-slate-200 p-3 rounded-lg text-xs outline-none focus:border-emerald-500 min-h-[70px]"
                  placeholder="Feedback / comments (required if requesting revision)"
                  value={comments[p.id] || ''}
                  maxLength={1000}
                  onChange={(e) => setComments((prev) => ({ ...prev, [p.id]: e.target.value }))}
                />
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleReview(p.id, true)}
                    className="bg-emerald-500 text-white font-bold py-2.5 rounded-lg flex justify-center items-center text-sm shadow hover:bg-emerald-600 transition"
                  >
                    <CheckCircle size={16} className="mr-1.5" /> Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReview(p.id, false)}
                    className="bg-white border border-red-400 text-red-500 font-bold py-2.5 rounded-lg flex justify-center items-center text-sm hover:bg-red-50 transition"
                  >
                    <XCircle size={16} className="mr-1.5" /> Request Revision
                  </button>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default WeeklyPlanReviewList;