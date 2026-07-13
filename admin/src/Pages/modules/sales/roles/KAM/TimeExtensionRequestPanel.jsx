// src/Pages/modules/sales/roles/KAM/TimeExtensionRequestPanel.jsx
import React, { useState } from 'react';
import { Clock3 } from 'lucide-react';
import { useToast } from '../../../../../Components/hooks/useToast';
import { requestTimeExtension, submitFinalOnboarding } from '../../services/customerService';
import { isRequired } from '../../../../../Components/utils/validators';

const MAX_REQUESTABLE_DAYS = 90;

const TimeExtensionRequestPanel = ({ customer, onUpdated }) => {
  const { showToast } = useToast();
  const [requestedDays, setRequestedDays] = useState('5');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const allDocsClean =
    (customer.documents || []).length > 0 &&
    customer.documents.every((d) => d.scanStatus === 'CLEAN');

  const handleRequestExtension = async () => {
    const days = Number(requestedDays);
    if (!Number.isFinite(days) || days < 1 || days > MAX_REQUESTABLE_DAYS) {
      return showToast(`Requested days must be between 1 and ${MAX_REQUESTABLE_DAYS}`, 'warning');
    }
    if (!isRequired(reason)) return showToast('Reason is required', 'warning');

    setIsSubmitting(true);
    try {
      const updated = await requestTimeExtension(customer.id, days, reason);
      showToast('Time extension requested — awaiting Line Manager decision', 'success');
      onUpdated?.(updated);
      setReason('');
    } catch (err) {
      showToast(err?.message || 'Request failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitFinalOnboarding = async () => {
    if (!allDocsClean) return showToast('All documents must be uploaded and cleared before final onboarding', 'warning');
    setIsSubmitting(true);
    try {
      const updated = await submitFinalOnboarding(customer.id);
      showToast('Final onboarding request submitted to Line Manager', 'success');
      onUpdated?.(updated);
    } catch (err) {
      showToast(err?.message || 'Submission failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-purple-300 p-6 space-y-5">
      <h3 className="font-bold text-slate-900 text-base flex items-center">
        <Clock3 size={18} className="mr-2 text-purple-600" /> Time Extension / Final Onboarding
      </h3>

      <div className="space-y-3 border-b border-slate-100 pb-5">
        <p className="text-xs font-bold text-slate-600">Request Extension (default 5 days, LM may grant more)</p>
        <input
          type="number"
          min="1"
          max={MAX_REQUESTABLE_DAYS}
          value={requestedDays}
          onChange={(e) => setRequestedDays(e.target.value)}
          className="w-full border border-slate-300 p-2.5 rounded-lg text-sm outline-none focus:border-purple-500"
        />
        <textarea
          className="w-full text-xs border border-slate-300 p-3 rounded-lg outline-none focus:border-purple-500 min-h-[70px]"
          placeholder="Reason for extension request"
          value={reason}
          maxLength={500}
          onChange={(e) => setReason(e.target.value)}
        />
        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleRequestExtension}
          className="w-full bg-purple-600 text-white font-bold py-2.5 rounded-lg text-sm shadow hover:bg-purple-700 transition disabled:opacity-50"
        >
          Request Extension
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-bold text-slate-600">
          Final Onboarding {allDocsClean ? '' : '(locked until documents are cleared)'}
        </p>
        <button
          type="button"
          disabled={isSubmitting || !allDocsClean}
          onClick={handleSubmitFinalOnboarding}
          className="w-full bg-emerald-700 text-white font-bold py-3 rounded-lg text-sm shadow-md hover:bg-emerald-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Submit for Final Onboarding
        </button>
      </div>
    </div>
  );
};

export default TimeExtensionRequestPanel;