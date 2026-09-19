// admin/src/Pages/modules/sales/components/RateHistoryModal.jsx
import { X, History } from 'lucide-react';
import { formatRateRef, rateSourceLabel } from '../../../../Components/utils/format';

// Every rate the customer has been quoted, newest first. After two or three
// rounds of rejection the current figure means very little on its own — what
// people actually need is what it replaced, when, and who set it.
const RateHistoryModal = ({ customer, onClose }) => {
  const history = Array.isArray(customer?.rateHistory) ? customer.rateHistory : [];
  const entries = [...history].sort((a, b) => {
    const at = a.changedAt ? new Date(a.changedAt).getTime() : 0;
    const bt = b.changedAt ? new Date(b.changedAt).getTime() : 0;
    return bt - at;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center shrink-0">
          <h3 className="font-bold text-slate-800 flex items-center">
            <History size={17} className="mr-2 text-emerald-600" /> Rate History
          </h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-700 transition">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-3">
          <div className="border-2 border-emerald-300 bg-emerald-50/50 rounded-lg p-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
                Current Rate
              </span>
              <span className="text-[10px] font-mono text-slate-500">{formatRateRef(customer)}</span>
            </div>
            <p className="text-sm font-bold text-slate-800 mt-1 break-words">
              {customer.approvedRate || customer.proposedRate || '—'}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Given by: <strong>{rateSourceLabel(customer.rateSource)}</strong>
            </p>
          </div>

          {entries.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">
              This is the first rate — nothing has been replaced yet.
            </p>
          ) : (
            entries.map((entry, i) => (
              <div key={`${entry.changedAt || i}-${i}`} className="border border-slate-200 rounded-lg p-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Previous Rate
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {entry.changedAt ? new Date(entry.changedAt).toLocaleString() : ''}
                  </span>
                </div>
                <p className="text-sm text-slate-700 mt-1 break-words line-through decoration-slate-300">
                  {entry.rate || '—'}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                  {entry.rateRef && (
                    <span className="text-[10px] font-mono text-slate-400">REF-{entry.rateRef}</span>
                  )}
                  <span className="text-[11px] text-slate-500">
                    Given by: <strong>{rateSourceLabel(entry.source)}</strong>
                  </span>
                </div>
                {entry.reason && (
                  <p className="text-[11px] text-red-600 mt-1.5 break-words">
                    Replaced because: {entry.reason}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default RateHistoryModal;