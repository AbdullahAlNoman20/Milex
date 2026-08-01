// admin/src/Pages/modules/sales/components/CustomerEditHistoryModal.jsx
import { useEffect, useState } from 'react';
import { X, History, Loader2 } from 'lucide-react';
import { getCustomerEditHistory } from '../services/customerService';
import { humanizeStatus } from '../../../../Components/utils/format';

const formatValue = (v) => {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
};

const DiffRow = ({ label, before, after }) => (
  <div className="grid grid-cols-2 gap-3 text-xs py-1.5 border-b border-slate-50 last:border-0">
    <div>
      <span className="block text-[10px] font-bold text-slate-400 uppercase">{label} (Before)</span>
      <span className="text-slate-500 break-words">{formatValue(before)}</span>
    </div>
    <div>
      <span className="block text-[10px] font-bold text-emerald-600 uppercase">{label} (After)</span>
      <span className="text-slate-800 font-semibold break-words">{formatValue(after)}</span>
    </div>
  </div>
);

const HistoryEntry = ({ entry }) => {
  const before = entry.beforeState && typeof entry.beforeState === 'object' ? entry.beforeState : {};
  const after = entry.afterState && typeof entry.afterState === 'object' ? entry.afterState : {};
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];

  return (
    <div className="border border-slate-200 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-1">
        <p className="text-xs font-bold text-slate-800">{humanizeStatus(entry.action)}</p>
        <p className="text-[10px] text-slate-400">{new Date(entry.createdAt).toLocaleString()}</p>
      </div>
      <p className="text-[11px] text-slate-500">By: {entry.actor?.name || 'System'}</p>
      {keys.length > 0 && (
        <div className="pt-1">
          {keys.map((k) => (
            <DiffRow key={k} label={k} before={before[k]} after={after[k]} />
          ))}
        </div>
      )}
    </div>
  );
};

const CustomerEditHistoryModal = ({ customerId, onClose }) => {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getCustomerEditHistory(customerId)
      .then(setItems)
      .catch((err) => setError(err?.message || 'Failed to load history'))
      .finally(() => setIsLoading(false));
  }, [customerId]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 flex items-center">
            <History size={17} className="mr-2 text-emerald-600" /> Edit History
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 transition">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-5 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-slate-400 gap-2">
              <Loader2 size={16} className="animate-spin" /> Loading history...
            </div>
          ) : error ? (
            <p className="text-sm text-red-600 text-center py-10">{error}</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10">This customer does not have any history.</p>
          ) : (
            items.map((entry) => <HistoryEntry key={entry.id} entry={entry} />)
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerEditHistoryModal;