// src/Pages/modules/sales/roles/KAM/InfoUpdateRequestPanel.jsx
import { useState, useRef } from 'react';
import { useSales } from '../../hooks/useSales';
import { useToast } from '../../../../../Components/hooks/useToast';
import { STATUS } from '../../constants/salesStatus';
import { isRequired } from '../../../../../Components/utils/validators';
import { sanitizeText } from '../../../../../Components/utils/sanitize';

const InfoUpdateRequestPanel = ({ customer, mode }) => {
  const { updateStatus } = useSales();
  const { showToast } = useToast();
  const [field, setField] = useState('');
  const [newValue, setNewValue] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const [isSubmitting, setIsSubmittingLocal] = useState(false);
  const submitLockRef = useRef(false);

  if (mode === 'offer-feedback') {
    // Belt and braces: even if a stale page still has this panel on screen,
    // it stops offering an answer once one has been recorded.
    if (customer.offerAccepted || customer.offerRejected) {
      return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center">
            {customer.offerAccepted
              ? 'Offer accepted — recorded'
              : 'Offer rejected — back with the Line Manager'}
          </p>
        </div>
      );
    }

    const handleAccept = async () => {
      if (submitLockRef.current) return;
      submitLockRef.current = true;
      setIsSubmittingLocal(true);
      try {
        await updateStatus(customer.id, customer.status, {}, 'OFFER ACCEPTED BY CUSTOMER', 'Proceed to Agreement');
      } finally {
        submitLockRef.current = false;
        setIsSubmittingLocal(false);
      }
    };
    const handleReject = async () => {
      if (submitLockRef.current) return;
      if (!isRequired(rejectReason)) return showToast('Provide a reason for rejection', 'warning');
      submitLockRef.current = true;
      setIsSubmittingLocal(true);
      try {
        await updateStatus(
          customer.id,
          STATUS.OFFER_REJECTED,
          { rejectReason: sanitizeText(rejectReason, { maxLength: 500 }), revision: (customer.revision || 0) + 1 },
          'OFFER REJECTED BY CUSTOMER'
        );
      } finally {
        submitLockRef.current = false;
        setIsSubmittingLocal(false);
      }
    };

    return (
      <div className="bg-white rounded-xl shadow-sm border border-emerald-600 p-6 space-y-4">
        <h3 className="font-bold text-slate-900 text-base">Client Feedback</h3>
        <div className="flex gap-3">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleAccept}
            className="flex-1 bg-emerald-600 text-white text-xs font-bold py-3 rounded-lg shadow hover:bg-emerald-700 transition disabled:opacity-50"
          >
            Accept
          </button>
        </div>
        <textarea
          className="w-full border border-red-200 p-3 rounded-lg text-xs outline-none focus:border-red-500 min-h-[70px]"
          placeholder="Reason for rejection (required to reject)"
          value={rejectReason}
          maxLength={500}
          onChange={(e) => setRejectReason(e.target.value)}
        />
        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleReject}
          className="w-full bg-red-600 text-white text-xs font-bold py-3 rounded-lg shadow-md hover:bg-red-700 transition disabled:opacity-50"
        >
          Submit Rejection
        </button>
      </div>
    );
  }

  const handleRequestUpdate = async () => {
    if (submitLockRef.current) return;
    if (!isRequired(field) || !isRequired(newValue)) return showToast('Field and new value are required', 'warning');
    submitLockRef.current = true;
    setIsSubmittingLocal(true);
    try {
      await updateStatus(
        customer.id,
        STATUS.INFO_UPDATE_PENDING,
        {
          pendingInfoUpdate: {
            field: sanitizeText(field, { maxLength: 100 }),
            newValue: sanitizeText(newValue, { maxLength: 500 }),
            requestedAt: new Date().toISOString(),
          },
        },
        'INFO UPDATE REQUESTED BY KAM',
        'Awaiting Line Manager approval'
      );
      setField('');
      setNewValue('');
    } finally {
      submitLockRef.current = false;
      setIsSubmittingLocal(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
      <h3 className="font-bold text-slate-900 text-base">Request Customer Info Update</h3>
      <input
        className="w-full text-xs border border-slate-300 p-2.5 rounded-lg outline-none focus:border-emerald-500"
        placeholder="Field to update (e.g. mobile, address)"
        value={field}
        maxLength={100}
        onChange={(e) => setField(e.target.value)}
      />
      <textarea
        className="w-full text-xs border border-slate-300 p-3 rounded-lg outline-none focus:border-emerald-500 min-h-[70px]"
        placeholder="New value"
        value={newValue}
        maxLength={500}
        onChange={(e) => setNewValue(e.target.value)}
      />
      <button
        type="button"
        disabled={isSubmitting}
        onClick={handleRequestUpdate}
        className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg text-sm shadow-md hover:bg-blue-700 transition disabled:opacity-50"
      >
        Submit for LM Approval
      </button>
    </div>
  );
};

export default InfoUpdateRequestPanel;