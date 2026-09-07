// admin/src/Pages/modules/sales/roles/LineManager/ReviseRateApprovalPanel.jsx — NEW FILE
import { useState, useRef } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { useSales } from '../../hooks/useSales';
import { useToast } from '../../../../../Components/hooks/useToast';
import { isRequired } from '../../../../../Components/utils/validators';
import { sanitizeText } from '../../../../../Components/utils/sanitize';

const ReviseRateApprovalPanel = ({ customer }) => {
  const { updateStatus } = useSales();
  const { showToast } = useToast();
  const [approvedRate, setApprovedRate] = useState(customer.proposedRate || '');
  const [lmNote, setLmNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLockRef = useRef(false);

  const handleApprove = async () => {
    if (submitLockRef.current) return;
    if (!isRequired(approvedRate)) return showToast('Approved rate is required', 'warning');
    submitLockRef.current = true;
    setIsSubmitting(true);
    try {
      await updateStatus(
        customer.id,
        'PROVISIONAL_ACTIVE',
        { approvedRate: sanitizeText(approvedRate, { maxLength: 300 }), lmNote: sanitizeText(lmNote, { maxLength: 500 }) },
        'NEW RATE APPROVED BY LM',
        'Awaiting Sales Coordinator to send the revised offer letter'
      );
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-amber-400 p-6 space-y-4">
      <h3 className="font-bold text-slate-900 text-base flex items-center">
        <XCircle size={18} className="mr-2 text-red-500" /> Customer Rejected the Offer
      </h3>
      {customer.rejectReason && (
        <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-xs text-red-700">
          <strong>Customer's feedback:</strong> {customer.rejectReason}
        </div>
      )}
      <p className="text-xs text-slate-500">
        Review the feedback and approve a new rate — this will go to the Sales Coordinator to send as a revised offer letter.
      </p>
      <textarea
        className="w-full text-xs border border-slate-300 p-3 rounded-lg outline-none focus:border-emerald-500 min-h-[70px]"
        placeholder="New approved rate"
        value={approvedRate}
        maxLength={300}
        onChange={(e) => setApprovedRate(e.target.value)}
      />
      <textarea
        className="w-full text-xs border border-slate-300 p-3 rounded-xl outline-none focus:border-emerald-500 min-h-[70px]"
        placeholder="Notes (optional)"
        value={lmNote}
        maxLength={500}
        onChange={(e) => setLmNote(e.target.value)}
      />
      <button
        type="button"
        disabled={isSubmitting}
        onClick={handleApprove}
        className="w-full bg-emerald-500 text-white font-bold py-3 rounded-xl flex justify-center items-center text-sm shadow hover:bg-emerald-600 transition disabled:opacity-50"
      >
        <CheckCircle size={16} className="mr-1.5" /> Approve New Rate & Send to Sales Coordinator
      </button>
    </div>
  );
};

export default ReviseRateApprovalPanel;