// admin/src/Pages/modules/sales/components/AssignmentHistoryCard.jsx
import { useState, useEffect } from 'react';
import { UserCog, ArrowRight } from 'lucide-react';
import { listAssignmentHistory } from '../services/customerService';
import { ROLE_LABELS } from '../../../../Components/constants/roles';

// The account's chain of custody. The customer record itself only ever holds
// whoever has it now, so this is the only place that answers "who had this in
// March, and who moved it" — the question asked when a commission, a promise
// or a complaint has to be traced back to a person.
const AssignmentHistoryCard = ({ customer, reloadToken = 0 }) => {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let cancelled = false;
    listAssignmentHistory(customer.id)
      .then((data) => {
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [customer.id, reloadToken]);

  const handovers = items.filter((i) => i.reason === 'REASSIGNED');
  // The opening entry names who raised the account, which survives every
  // later handover and is often the more useful of the two.
  const created = items.find((i) => i.reason === 'CREATED');
  const createdByName = customer.recommendedBy?.name || created?.assignedBy?.name || '—';
  const createdRole = customer.createdByRole || created?.assignedByRole;

  return (
    <div>
      <div className="px-1 pb-2.5">
        <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
          <UserCog size={16} className="text-slate-400" /> Account Ownership
        </h3>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          <div className="px-4 sm:px-5 py-3">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1">
              Created By
            </p>
            <p className="text-sm font-medium text-slate-800 break-words">{createdByName}</p>
            <p className="text-[11px] text-slate-400 break-words">
              {createdRole ? ROLE_LABELS[createdRole] || createdRole : ''}
              {customer.createdAt ? ` · ${new Date(customer.createdAt).toLocaleDateString()}` : ''}
            </p>
          </div>
          <div className="px-4 sm:px-5 py-3">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1">
              Currently Handled By
            </p>
            <p className="text-sm font-medium text-slate-800 break-words">
              {customer.handledBy?.name || '—'}
            </p>
            <p className="text-[11px] text-slate-400">
              {handovers.length === 0
                ? 'Never reassigned'
                : `Reassigned ${handovers.length} time${handovers.length === 1 ? '' : 's'}`}
            </p>
          </div>
        </div>

        {handovers.length > 0 && (
          <div className="border-t border-slate-100">
            <p className="px-4 sm:px-5 pt-3 pb-1 text-[11px] font-bold text-slate-400 uppercase tracking-wide">
              Handover History
            </p>
            <div className="divide-y divide-slate-100">
              {handovers.map((h) => (
                <div key={h.id} className="px-4 sm:px-5 py-3 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-slate-500 break-words">
                      {h.previous?.name || 'Unassigned'}
                    </span>
                    <ArrowRight size={12} className="text-slate-300 shrink-0" />
                    <span className="font-semibold text-slate-800 break-words">
                      {h.assignedTo?.name || '—'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 break-words">
                    By {h.assignedBy?.name || 'system'}
                    {h.assignedByRole ? ` (${ROLE_LABELS[h.assignedByRole] || h.assignedByRole})` : ''}
                    {' · '}
                    {new Date(h.createdAt).toLocaleString()}
                  </p>
                  {h.note && <p className="text-[11px] text-slate-600 mt-1 break-words">{h.note}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssignmentHistoryCard;