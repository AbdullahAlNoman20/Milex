// admin/src/Pages/modules/sales/roles/LineManager/RejectRecommendationPanel.jsx
import { useState, useRef } from 'react';
import { XCircle, Loader2 } from 'lucide-react';
import { rejectRate } from '../../services/customerService';
import { useToast } from '../../../../../Components/hooks/useToast';
import { useConfirm } from '../../../../../Components/hooks/useConfirm';

const MIN_REASON_LENGTH = 3;
const MAX_REASON_LENGTH = 1000;

const RejectRecommendationPanel = ({ customer, onUpdated }) => {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const lockRef = useRef(false);

  const handleReject = async () => {
    if (lockRef.current) return;
    const trimmed = reason.trim();
    if (trimmed.length < MIN_REASON_LENGTH) {
      return showToast('Write the reason for rejecting this recommendation', 'warning');
    }
    const ok = await confirm({
      title: 'Reject this recommendation?',
      message: `${customer.accountName} goes back to the KAM with your reason. They correct it and send it to the Line Manager again.`,
      confirmLabel: 'Reject',
      tone: 'danger',
    });
    if (!ok) return;

    lockRef.current = true;
    setIsSubmitting(true);
    try {
      await rejectRate(customer.id, trimmed.slice(0, MAX_REASON_LENGTH));
      showToast('Recommendation sent back to the KAM', 'success');
      setReason('');
      setIsOpen(false);
      onUpdated?.();
    } catch (err) {
      showToast(err?.message || 'Could not reject the recommendation', 'error');
    } finally {
      lockRef.current = false;
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full border border-red-300 text-red-600 bg-white font-bold py-3 rounded-xl flex justify-center items-center text-sm hover:bg-red-50 transition"
      >
        <XCircle size={16} className="mr-1.5" />
        Reject Recommendation
      </button>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-red-300 p-4 sm:p-6 space-y-4">
      <h3 className="font-bold text-slate-900 text-base">Reject Recommendation</h3>
      <div>
        <label
          htmlFor={`reject-reason-${customer.id}`}
          className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5"
        >
          Reason for Rejection <span className="text-red-500">*</span>
        </label>
        <textarea
          id={`reject-reason-${customer.id}`}
          className="w-full text-xs border border-slate-300 p-3 rounded-lg outline-none focus:border-red-500 min-h-[90px]"
          placeholder="What does the KAM need to correct?"
          value={reason}
          maxLength={MAX_REASON_LENGTH}
          onChange={(e) => setReason(e.target.value)}
        />
        <p className="text-[10px] text-slate-400 mt-1 text-right">
          {reason.length}/{MAX_REASON_LENGTH}
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleReject}
          className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl flex justify-center items-center text-sm shadow hover:bg-red-700 transition disabled:opacity-50"
        >
          {isSubmitting ? (
            <Loader2 size={16} className="mr-1.5 animate-spin" />
          ) : (
            <XCircle size={16} className="mr-1.5" />
          )}
          Reject &amp; Send Back to KAM
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => {
            setIsOpen(false);
            setReason('');
          }}
          className="sm:w-28 bg-slate-100 text-slate-600 font-bold py-3 rounded-xl text-sm hover:bg-slate-200 transition disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default RejectRecommendationPanel;