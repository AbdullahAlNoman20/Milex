// src/Pages/modules/sales/roles/LineManager/FollowUpReminderPanel.jsx
import React, { useState } from 'react';
import { BellRing } from 'lucide-react';
import { useSales } from '../../hooks/useSales';
import { useToast } from '../../../../../Components/hooks/useToast';
import { deriveFollowUps } from '../../services/followUpService';
import { isValidDateString } from '../../../../../Components/utils/validators';

const FollowUpReminderPanel = () => {
  const { customers, updateCustomerMeta } = useSales();
  const { showToast } = useToast();
  const [editing, setEditing] = useState(null);
  const [draftDate, setDraftDate] = useState('');
  const [draftNote, setDraftNote] = useState('');

  const items = deriveFollowUps(customers);

  const startEdit = (item) => {
    setEditing(item.customerId);
    setDraftDate(item.followUpDate ? item.followUpDate.slice(0, 10) : '');
    setDraftNote(item.followUpNote || '');
  };

  const saveEdit = (customerId) => {
    if (draftDate && !isValidDateString(draftDate)) return showToast('Invalid follow-up date', 'warning');
    updateCustomerMeta(customerId, {
      followUpDate: draftDate ? new Date(draftDate).toISOString() : null,
      followUpNote: draftNote.slice(0, 500),
    });
    setEditing(null);
    showToast('Follow-up updated', 'success');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      <h2 className="text-2xl font-bold text-slate-800 flex items-center">
        <BellRing size={22} className="mr-2 text-amber-500" /> Follow-up Reminders
      </h2>

      {items.length === 0 ? (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center text-slate-400">
          No active pipeline accounts to follow up on.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.customerId}
              className={`bg-white p-5 rounded-xl shadow-sm border ${item.isOverdue ? 'border-red-300' : 'border-slate-200'}`}
            >
              <div className="flex flex-wrap justify-between items-start gap-3">
                <div>
                  <p className="font-bold text-slate-800">{item.accountName}</p>
                  <p className="text-xs text-slate-500 font-mono">{item.barcode}</p>
                  <p className="text-xs font-bold text-amber-600 mt-1">{item.status}</p>
                </div>
                {item.isOverdue && (
                  <span className="text-[10px] font-bold uppercase bg-red-50 text-red-700 border border-red-200 px-2 py-1 rounded">
                    Overdue
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-xs">
                {item.commitment && (
                  <div>
                    <span className="block text-slate-400 font-bold uppercase mb-1">Commitment</span>
                    <p className="text-slate-700">{item.commitment}</p>
                  </div>
                )}
                {item.clientFeedback && (
                  <div>
                    <span className="block text-slate-400 font-bold uppercase mb-1">Client Feedback</span>
                    <p className="text-slate-700">{item.clientFeedback}</p>
                  </div>
                )}
                {item.proposedRate && (
                  <div>
                    <span className="block text-slate-400 font-bold uppercase mb-1">Proposed Rate</span>
                    <p className="text-slate-700">{item.proposedRate}</p>
                  </div>
                )}
                {item.approvedRate && (
                  <div>
                    <span className="block text-slate-400 font-bold uppercase mb-1">Approved Rate</span>
                    <p className="text-slate-700">{item.approvedRate}</p>
                  </div>
                )}
              </div>

              {editing === item.customerId ? (
                <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                  <input
                    type="date"
                    className="border border-slate-200 p-2 rounded text-xs outline-none focus:border-emerald-500"
                    value={draftDate}
                    onChange={(e) => setDraftDate(e.target.value)}
                  />
                  <textarea
                    className="w-full border border-slate-200 p-2.5 rounded text-xs outline-none focus:border-emerald-500 min-h-[60px]"
                    placeholder="Follow-up note"
                    value={draftNote}
                    maxLength={500}
                    onChange={(e) => setDraftNote(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => saveEdit(item.customerId)}
                      className="bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded hover:bg-emerald-700 transition"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(null)}
                      className="bg-slate-100 text-slate-600 text-xs font-bold px-4 py-2 rounded hover:bg-slate-200 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => startEdit(item)}
                  className="mt-3 text-xs font-bold text-blue-600 hover:underline"
                >
                  {item.followUpDate ? 'Edit follow-up' : 'Set follow-up date'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FollowUpReminderPanel;