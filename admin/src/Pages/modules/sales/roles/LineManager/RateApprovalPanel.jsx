// admin/src/Pages/modules/sales/roles/LineManager/RateApprovalPanel.jsx
import { useState, useRef } from 'react';
import { CheckCircle, FileOutput, Loader2 } from 'lucide-react';
import { useSales } from '../../hooks/useSales';
import { useToast } from '../../../../../Components/hooks/useToast';
import { getDocumentSignedUrl } from '../../services/customerService';
import { STATUS, CREDIT_RULES } from '../../constants/salesStatus';
import { isRequired, isValidCreditPeriod } from '../../../../../Components/utils/validators';
import { sanitizeText } from '../../../../../Components/utils/sanitize';

const RateApprovalPanel = ({ customer }) => {
  const { updateStatus } = useSales();
  const { showToast } = useToast();
  const [approvedRate, setApprovedRate] = useState(customer.proposedRate || '');
  const [lmNote, setLmNote] = useState('');
  const [creditPeriod, setCreditPeriod] = useState(customer.creditPeriodDays || String(CREDIT_RULES.DEFAULT_PERIOD_DAYS));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpeningRateDoc, setIsOpeningRateDoc] = useState(false);
  const submitLockRef = useRef(false);

  // The rate sheet the KAM attached to the recommendation. This button used
  // to do nothing at all — it now opens that document, and says so plainly
  // when the KAM didn't attach one.
  const rateDocument = (customer.documents || []).find(
    (d) => d.documentType === 'RECOMMENDATION_ATTACHMENT'
  );

  const handleOpenRateDocument = async () => {
    if (!rateDocument) {
      return showToast('The KAM did not attach a rate document to this recommendation.', 'warning');
    }
    if (rateDocument.scanStatus !== 'CLEAN') {
      return showToast('This file is still being checked — try again shortly', 'warning');
    }
    setIsOpeningRateDoc(true);
    try {
      const url = await getDocumentSignedUrl(rateDocument.storageKey);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      showToast(err?.message || 'Could not open the rate document', 'error');
    } finally {
      setIsOpeningRateDoc(false);
    }
  };

  const handleApprove = async () => {
    if (submitLockRef.current) return;
    if (!isRequired(approvedRate)) return showToast('Approved rate is required', 'warning');
    if (!isValidCreditPeriod(creditPeriod)) {
      return showToast(`Credit period must be between 1 and ${CREDIT_RULES.MAX_EXTENDED_PERIOD_DAYS} days`, 'warning');
    }
    submitLockRef.current = true;
    setIsSubmitting(true);
    try {
      await updateStatus(
        customer.id,
        STATUS.APPROVED_PENDING_OFFER,
        {
          approvedRate: sanitizeText(approvedRate, { maxLength: 300 }),
          lmNote: sanitizeText(lmNote, { maxLength: 500 }),
          creditPeriodDays: creditPeriod,
          creditPeriodExtendedByLM: Number(creditPeriod) > CREDIT_RULES.DEFAULT_PERIOD_DAYS,
        },
        'RATE APPROVED BY LM',
        'Waiting for SC Offer letter'
      );
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  };
  return (
    <div className="bg-white rounded-xl shadow-sm border border-emerald-600 p-6 space-y-4">
      <h3 className="font-bold text-slate-900 text-base">Rate Approval</h3>
      <p className="text-[11px] text-slate-500">
        Review the KAM's proposed rate below. Edit it directly if a different rate is needed, then approve.
      </p>

      {customer.rateRef && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">RATE REFERENCE</p>
          <p className="font-black text-xl text-slate-800 mb-2">{customer.rateRef}</p>
          <button
            type="button"
            onClick={handleOpenRateDocument}
            disabled={isOpeningRateDoc}
            className="text-xs text-blue-600 font-bold flex items-center justify-center w-full hover:underline disabled:opacity-50"
          >
            {isOpeningRateDoc ? <Loader2 size={14} className="mr-1 animate-spin" /> : <FileOutput size={14} className="mr-1" />}
            {rateDocument ? 'Open Attached Rate Document' : 'No Rate Document Attached'}
          </button>
        </div>
      )}

      <textarea
        className="w-full text-xs border border-slate-300 p-3 rounded-lg outline-none focus:border-emerald-500 min-h-[70px]"
        placeholder="Approved rate details (edit to propose a different rate)"
        value={approvedRate}
        maxLength={300}
        onChange={(e) => setApprovedRate(e.target.value)}
      />

      <div>
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
          Credit Period (Days) — Default {CREDIT_RULES.DEFAULT_PERIOD_DAYS}, Max {CREDIT_RULES.MAX_EXTENDED_PERIOD_DAYS}
        </label>
        <input
          type="number"
          min="1"
          max={CREDIT_RULES.MAX_EXTENDED_PERIOD_DAYS}
          className="w-full border border-slate-300 p-2.5 rounded-lg text-sm outline-none focus:border-emerald-500"
          value={creditPeriod}
          onChange={(e) => setCreditPeriod(e.target.value)}
        />
      </div>

      <textarea
        className="w-full text-xs border border-slate-300 p-3 rounded-xl outline-none focus:border-emerald-500 min-h-[70px]"
        placeholder="Notes..."
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
        <CheckCircle size={16} className="mr-1.5" /> Approve & Forward to Sales Coordinator
      </button>
    </div>
  );
};

export default RateApprovalPanel;