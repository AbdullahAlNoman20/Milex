// admin/src/Pages/modules/sales/roles/HOD/HodRatePanel.jsx
import { useState, useRef } from 'react';
import { Crown, CheckCircle, Loader2 } from 'lucide-react';
import { grantHodRate } from '../../services/customerService';
import { useToast } from '../../../../../Components/hooks/useToast';
import { useConfirm } from '../../../../../Components/hooks/useConfirm';
import { isRequired } from '../../../../../Components/utils/validators';

// One field, because there is one decision. The Head of Department is being
// asked for a number, not to review the rate that already failed — showing
// that alongside an input just invites it to be copied back unchanged.
const HodRatePanel = ({ customer, onUpdated }) => {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [newRate, setNewRate] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const lockRef = useRef(false);

  const handleGrant = async () => {
    if (lockRef.current) return;
    if (!isRequired(newRate)) return showToast('Enter the rate you are setting', 'warning');

    const ok = await confirm({
      title: 'Set this as the best rate?',
      message: `${customer.accountName} will be quoted ${newRate.trim()}. The KAM and their Line Manager are told it came from you.`,
      confirmLabel: 'Set rate',
    });
    if (!ok) return;

    lockRef.current = true;
    setIsSubmitting(true);
    try {
      await grantHodRate(customer.id, newRate.trim(), note.trim() || undefined);
      showToast('Best rate set', 'success');
      setNewRate('');
      setNote('');
      onUpdated?.();
    } catch (err) {
      showToast(err?.message || 'Could not set the rate', 'error');
    } finally {
      lockRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-indigo-400 p-6 space-y-4">
      <h3 className="font-bold text-slate-900 text-base flex items-center">
         Best Rate Requested
      </h3>

      {customer.lmNote && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-700 mb-1">
            Line Manager's Reason
          </p>
          <p className="text-xs text-slate-700 break-words">{customer.lmNote}</p>
        </div>
      )}

      <div>
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
          Best Rate
        </label>
        <textarea
          className="w-full text-xs border border-slate-300 p-3 rounded-lg outline-none focus:border-indigo-500 min-h-[80px]"
          placeholder="e.g. 28 USD/Kg + 10 USD Custom"
          value={newRate}
          maxLength={300}
          onChange={(e) => setNewRate(e.target.value)}
        />
      </div>

      <input
        className="w-full text-xs border border-slate-300 p-2.5 rounded-lg outline-none focus:border-indigo-500"
        placeholder="Note (optional)"
        value={note}
        maxLength={1000}
        onChange={(e) => setNote(e.target.value)}
      />

      <button
        type="button"
        disabled={isSubmitting}
        onClick={handleGrant}
        className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl flex justify-center items-center text-sm shadow hover:bg-indigo-700 transition disabled:opacity-50"
      >
        {isSubmitting ? (
          <Loader2 size={16} className="mr-1.5 animate-spin" />
        ) : (
          <CheckCircle size={16} className="mr-1.5" />
        )}
        Set Best Rate &amp; Send to KAM
      </button>
    </div>
  );
};

export default HodRatePanel;