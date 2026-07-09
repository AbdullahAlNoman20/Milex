// src/Pages/modules/sales/roles/KAM/ReviseRecommendationPanel.jsx
import React, { useState } from 'react';
import { XCircle } from 'lucide-react';
import { useSales } from '../../hooks/useSales';
import { useToast } from '../../../../../Components/hooks/useToast';
import { STATUS } from '../../constants/salesStatus';
import { isRequired, isPositiveNumber } from '../../../../../Components/utils/validators';
import { sanitizeText } from '../../../../../Components/utils/sanitize';

const ReviseRecommendationPanel = ({ customer }) => {
  const { updateStatus } = useSales();
  const { showToast } = useToast();
  const [proposedRate, setProposedRate] = useState(customer.proposedRate || '');

  const isRejectedFlow = customer.status === STATUS.OFFER_REJECTED;

  const handleSubmit = () => {
    if (!isRequired(proposedRate)) return showToast('Enter a proposed rate', 'warning');
    updateStatus(
      customer.id,
      STATUS.PENDING_APPROVAL,
      { proposedRate: sanitizeText(proposedRate, { maxLength: 300 }), revision: (customer.revision || 0) + 1 },
      isRejectedFlow ? 'REVISED RATE SUBMITTED TO LM' : 'RATE SUBMITTED BY KAM'
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-emerald-600 p-6">
      <h3 className="font-bold text-slate-900 text-base mb-4">
        {isRejectedFlow ? 'Revise Rejected Offer' : 'Submit Recommended Rate'}
      </h3>
      {isRejectedFlow && customer.rejectReason && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700 flex gap-2">
          <XCircle size={14} className="shrink-0 mt-0.5" />
          <span>
            <strong>Client feedback:</strong> {customer.rejectReason}
          </span>
        </div>
      )}
      <textarea
        className="w-full text-xs border border-slate-300 p-3 rounded-lg mb-4 min-h-[80px] outline-none focus:border-emerald-500"
        value={proposedRate}
        maxLength={300}
        onChange={(e) => setProposedRate(e.target.value)}
        placeholder="e.g. 32 USD/Kg + 10 USD Custom"
      />
      <button
        type="button"
        onClick={handleSubmit}
        className="w-full bg-emerald-600 text-white font-bold py-3 rounded-lg shadow-sm text-sm hover:bg-emerald-700 transition"
      >
        Forward to Line Manager
      </button>
    </div>
  );
};

export default ReviseRecommendationPanel;