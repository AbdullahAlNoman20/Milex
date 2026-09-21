// admin/src/Pages/modules/sales/roles/LineManager/RateApprovalPanel.jsx
import { useState, useRef } from 'react';
import { CheckCircle, FileOutput, Loader2, ArrowUpCircle } from 'lucide-react';
import { useSales } from '../../hooks/useSales';
import { useToast } from '../../../../../Components/hooks/useToast';
import { useConfirm } from '../../../../../Components/hooks/useConfirm';
import { useAuth } from '../../../../../Components/hooks/useAuth';
import { ROLES } from '../../../../../Components/constants/roles';
import { getDocumentSignedUrl, escalateRateToHod } from '../../services/customerService';
import { STATUS, CREDIT_RULES } from '../../constants/salesStatus';
import { isRequired, isValidCreditPeriod } from '../../../../../Components/utils/validators';
import { sanitizeText } from '../../../../../Components/utils/sanitize';
import { humanizeStatus } from '../../../../../Components/utils/format';

// Two ways forward, and only two: set the rate here, or hand the decision to
// the Head of Department. They are tabs rather than two buttons on one form
// because they need different information and only one of them ever applies.
const RateApprovalPanel = ({ customer, onUpdated }) => {
  const { updateStatus } = useSales();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const { currentUser } = useAuth();
  // There is nobody above the Head of Department to escalate to, so for them
  // this panel is a single decision rather than a choice between two.
  const canEscalate =
    currentUser?.role !== ROLES.HEAD_OF_DEPARTMENT && currentUser?.role !== ROLES.SUPER_ADMIN;
  const [tab, setTab] = useState('approve');
  const [approvedRate, setApprovedRate] = useState(customer.approvedRate || customer.proposedRate || '');
  const [lmNote, setLmNote] = useState('');
  const [escalationReason, setEscalationReason] = useState('');
  const [creditPeriod, setCreditPeriod] = useState(
    customer.creditPeriodDays || String(CREDIT_RULES.DEFAULT_PERIOD_DAYS)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpeningRateDoc, setIsOpeningRateDoc] = useState(false);
  const submitLockRef = useRef(false);

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
    if (!isRequired(approvedRate)) return showToast('Enter the rate you are setting', 'warning');
    if (!isValidCreditPeriod(creditPeriod)) {
      return showToast(`Credit period must be between 1 and ${CREDIT_RULES.MAX_EXTENDED_PERIOD_DAYS} days`, 'warning');
    }
    const ok = await confirm({
      title: 'Set this rate?',
      message: ``,
      confirmLabel: 'Set rate',
    });
    if (!ok) return;

    submitLockRef.current = true;
    setIsSubmitting(true);
    try {
      await updateStatus(
        customer.id,
        STATUS.PENDING_KAM_REVIEW,
        {
          approvedRate: sanitizeText(approvedRate, { maxLength: 300 }),
          lmNote: sanitizeText(lmNote, { maxLength: 500 }),
          creditPeriodDays: creditPeriod,
          creditPeriodExtendedByLM: Number(creditPeriod) > CREDIT_RULES.DEFAULT_PERIOD_DAYS,
        },
        'RATE APPROVED BY LM',
        'Awaiting the KAM to review the rate'
      );
      onUpdated?.();
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleEscalate = async () => {
    if (submitLockRef.current) return;
    if (!isRequired(escalationReason)) {
      return showToast('Explain what you need from the Head of Department', 'warning');
    }
    const ok = await confirm({
      title: 'Ask the Head of Department for a best rate?',
      message: '',
      confirmLabel: 'Send request',
    });
    if (!ok) return;

    submitLockRef.current = true;
    setIsSubmitting(true);
    try {
      await escalateRateToHod(customer.id, escalationReason.trim());
      showToast('Sent to the Head of Department', 'success');
      setEscalationReason('');
      onUpdated?.();
    } catch (err) {
      showToast(err?.message || 'Could not send the request', 'error');
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-emerald-600 p-6 space-y-4">
      <h3 className="font-bold text-slate-900 text-base">Rate Decision</h3>

      {/* Shown unconditionally. It used to be hidden behind `customer.rateRef`,
          which is only written once a rate has been approved — so on the very
          request this panel exists to answer, the proposed figure and the
          supporting document the KAM attached were both invisible. */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
          KAM'S PROPOSED RATE
        </p>
        <p className="font-bold text-sm text-slate-800 mb-2 break-words">
          {customer.proposedRate || '—'}
        </p>
        <button
          type="button"
          onClick={handleOpenRateDocument}
          disabled={isOpeningRateDoc}
          className="text-xs text-blue-600 font-bold flex items-center justify-center w-full hover:underline disabled:opacity-50"
        >
          {isOpeningRateDoc ? (
            <Loader2 size={14} className="mr-1 animate-spin" />
          ) : (
            <FileOutput size={14} className="mr-1" />
          )}
          {rateDocument ? 'Open Attached Rate Document' : 'No Rate Document Attached'}
        </button>
      </div>

      {/* Why it came back. Written only into the history trail before, so the
          person being asked to set a new rate could not see what was asked. */}
      {customer.pendingRateRequest?.reason && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-700 mb-1">
            {customer.pendingRateRequest.requestedByName || 'The account holder'}
            {customer.pendingRateRequest.requestedByRole
              ? ` (${humanizeStatus(customer.pendingRateRequest.requestedByRole)})`
              : ''}{' '}
            asked for a better rate
          </p>
          <p className="text-xs text-slate-700 break-words">{customer.pendingRateRequest.reason}</p>
          <p className="text-[10px] text-slate-400 mt-1">
            {new Date(customer.pendingRateRequest.createdAt).toLocaleString()}
          </p>
        </div>
      )}

      {canEscalate && (
        <div className="flex gap-1 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setTab('approve')}
            className={`px-4 py-2 text-xs font-bold border-b-2 -mb-px transition ${
              tab === 'approve'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Approve Rate
          </button>
          <button
            type="button"
            onClick={() => setTab('request')}
            className={`px-4 py-2 text-xs font-bold border-b-2 -mb-px transition ${
              tab === 'request'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Request Best Rate from HOD
          </button>
        </div>
      )}

      {!canEscalate || tab === 'approve' ? (
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
              Rate You Are Setting
            </label>
            <textarea
              className="w-full text-xs border border-slate-300 p-3 rounded-lg outline-none focus:border-emerald-500 min-h-[70px]"
              placeholder="e.g. 32 USD/Kg + 10 USD Custom"
              value={approvedRate}
              maxLength={300}
              onChange={(e) => setApprovedRate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
              Credit Period (Days) — Default {CREDIT_RULES.DEFAULT_PERIOD_DAYS}, Max{' '}
              {CREDIT_RULES.MAX_EXTENDED_PERIOD_DAYS}
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
            className="w-full text-xs border border-slate-300 p-3 rounded-xl outline-none focus:border-emerald-500 min-h-[60px]"
            placeholder="Notes for the KAM (optional)"
            value={lmNote}
            maxLength={500}
            onChange={(e) => setLmNote(e.target.value)}
          />

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleApprove}
            className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl flex justify-center items-center text-sm shadow hover:bg-emerald-700 transition disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 size={16} className="mr-1.5 animate-spin" />
            ) : (
              <CheckCircle size={16} className="mr-1.5" />
            )}
            Approve Rate &amp; Send to KAM
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed">
            Request the Head of Department to provide the best applicable rate.
          </p>
          <textarea
            className="w-full text-xs border border-slate-300 p-3 rounded-lg outline-none focus:border-indigo-500 min-h-[90px]"
            value={escalationReason}
            maxLength={1000}
            onChange={(e) => setEscalationReason(e.target.value)}
          />
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleEscalate}
            className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl flex justify-center items-center text-sm shadow hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 size={16} className="mr-1.5 animate-spin" />
            ) : (
              <ArrowUpCircle size={16} className="mr-1.5" />
            )}
            Send Request to Head of Department
          </button>
        </div>
      )}
    </div>
  );
};

export default RateApprovalPanel;