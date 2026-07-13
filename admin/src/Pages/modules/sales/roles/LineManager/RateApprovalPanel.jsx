// src/Pages/modules/sales/roles/LineManager/RateApprovalPanel.jsx
import React, { useState } from 'react';
import { CheckCircle, XCircle, FileOutput } from 'lucide-react';
import { useSales } from '../../hooks/useSales';
import { useToast } from '../../../../../Components/hooks/useToast';
import { STATUS, CREDIT_RULES } from '../../constants/salesStatus';
import { isRequired, isValidCreditPeriod } from '../../../../../Components/utils/validators';
import { sanitizeText } from '../../../../../Components/utils/sanitize';

const RateApprovalPanel = ({ customer }) => {
  const { updateStatus } = useSales();
  const { showToast } = useToast();
  const [approvedRate, setApprovedRate] = useState(customer.proposedRate || '');
  const [lmNote, setLmNote] = useState('');
  const [authorizeExtension, setAuthorizeExtension] = useState(false);
  const [creditPeriod, setCreditPeriod] = useState(customer.creditPeriodDays || String(CREDIT_RULES.DEFAULT_PERIOD_DAYS));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isPreparingRate = customer.status === STATUS.PENDING_RATE;

  const handleApprove = async () => {
    if (isSubmitting) return;
    if (!isRequired(approvedRate)) return showToast('Approved rate is required', 'warning');
    if (!isValidCreditPeriod(creditPeriod, { extended: authorizeExtension })) {
      return showToast(
        `Credit period must be ${authorizeExtension ? `1-${CREDIT_RULES.MAX_EXTENDED_PERIOD_DAYS}` : CREDIT_RULES.DEFAULT_PERIOD_DAYS} days`,
        'warning'
      );
    }
    setIsSubmitting(true);
    await updateStatus(
      customer.id,
      STATUS.APPROVED_PENDING_OFFER,
      {
        approvedRate: sanitizeText(approvedRate, { maxLength: 300 }),
        lmNote: sanitizeText(lmNote, { maxLength: 500 }),
        creditPeriodDays: creditPeriod,
        creditPeriodExtendedByLM: authorizeExtension,
      },
      'RATE APPROVED BY LM',
      'Waiting for SC Offer letter'
    );
    setIsSubmitting(false);
  };

  const handleReject = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    await updateStatus(
      customer.id,
      STATUS.PENDING_RATE,
      { revision: (customer.revision || 0) + 1 },
      'RATE REJECTED BY LM',
      `Revision R-${(customer.revision || 0) + 1} requested`
    );
    setIsSubmitting(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-emerald-600 p-6 space-y-4">
      <h3 className="font-bold text-slate-900 text-base">Rate Approval</h3>

      {customer.rateRef && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">RATE REFERENCE</p>
          <p className="font-black text-xl text-slate-800 mb-2">{customer.rateRef}</p>
          <button type="button" className="text-xs text-blue-600 font-bold flex items-center justify-center w-full hover:underline">
            <FileOutput size={14} className="mr-1" /> Download to Verify
          </button>
        </div>
      )}

      <textarea
        className="w-full text-xs border border-slate-300 p-3 rounded-lg outline-none focus:border-emerald-500 min-h-[70px]"
        placeholder="Approved rate details"
        value={approvedRate}
        maxLength={300}
        onChange={(e) => setApprovedRate(e.target.value)}
      />

      <div className="grid grid-cols-2 gap-3">
        <input
          type="number"
          min="1"
          max={authorizeExtension ? CREDIT_RULES.MAX_EXTENDED_PERIOD_DAYS : CREDIT_RULES.DEFAULT_PERIOD_DAYS}
          className="border border-slate-300 p-2.5 rounded-lg text-xs outline-none focus:border-emerald-500"
          value={creditPeriod}
          onChange={(e) => setCreditPeriod(e.target.value)}
        />
        <label className="flex items-center gap-2 text-[10px] font-semibold text-slate-600">
          <input
            type="checkbox"
            checked={authorizeExtension}
            onChange={(e) => setAuthorizeExtension(e.target.checked)}
            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          Authorize up to {CREDIT_RULES.MAX_EXTENDED_PERIOD_DAYS}d
        </label>
      </div>

      <textarea
        className="w-full text-xs border border-slate-300 p-3 rounded-xl outline-none focus:border-emerald-500 min-h-[70px]"
        placeholder="Notes..."
        value={lmNote}
        maxLength={500}
        onChange={(e) => setLmNote(e.target.value)}
      />

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleApprove}
          className="bg-emerald-500 text-white font-bold py-3 rounded-xl flex justify-center items-center text-sm shadow hover:bg-emerald-600 transition disabled:opacity-50"
        >
          <CheckCircle size={16} className="mr-1.5" /> Approve
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleReject}
          className="bg-white border border-red-400 text-red-500 font-bold py-3 rounded-xl flex justify-center items-center text-sm hover:bg-red-50 transition disabled:opacity-50"
        >
          <XCircle size={16} className="mr-1.5" /> {isPreparingRate ? 'Send Back' : 'Revision'}
        </button>
      </div>
    </div>
  );
};

export default RateApprovalPanel;