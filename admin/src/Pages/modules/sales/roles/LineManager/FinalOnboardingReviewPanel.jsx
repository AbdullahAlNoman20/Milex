// src/Pages/modules/sales/roles/LineManager/FinalOnboardingReviewPanel.jsx
import React, { useState } from 'react';
import { CheckCircle, XCircle, ShieldCheck } from 'lucide-react';
import { useToast } from '../../../../../Components/hooks/useToast';
import { decideFinalOnboarding, decideTimeExtension } from '../../services/customerService';
import { isRequired } from '../../../../../Components/utils/validators';

const FinalOnboardingReviewPanel = ({ customer, onUpdated }) => {
  const { showToast } = useToast();
  const [comments, setComments] = useState('');
  const [grantedDays, setGrantedDays] = useState('5');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pendingExtension = (customer.extensionRequests || []).find((r) => r.approved === null);
  const isFinalReview = customer.status === 'PROVISIONAL_FINAL_REVIEW_PENDING';
  const isExtensionRequested = customer.status === 'PROVISIONAL_EXTENSION_REQUESTED';

  const handleExtensionDecision = async (approve) => {
    if (!pendingExtension) return;
    const days = Number(grantedDays);
    if (approve && (!Number.isFinite(days) || days < 1)) {
      return showToast('Enter valid granted days', 'warning');
    }
    setIsSubmitting(true);
    try {
      const updated = await decideTimeExtension(pendingExtension.id, approve, approve ? days : undefined);
      showToast(approve ? 'Extension approved' : 'Extension rejected', 'success');
      onUpdated?.(updated);
    } catch (err) {
      showToast(err?.message || 'Failed to record decision', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalDecision = async (approve) => {
    if (!approve && !isRequired(comments)) {
      return showToast('Comments are required when rejecting', 'warning');
    }
    setIsSubmitting(true);
    try {
      const updated = await decideFinalOnboarding(customer.id, approve, comments);
      showToast(approve ? 'Account activated' : 'Sent back to KAM for revision', 'success');
      onUpdated?.(updated);
      setComments('');
    } catch (err) {
      showToast(err?.message || 'Failed to record decision', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isFinalReview && !isExtensionRequested) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-purple-400 p-6 space-y-4">
      <h3 className="font-bold text-slate-900 text-base flex items-center">
        <ShieldCheck size={18} className="mr-2 text-purple-600" /> Onboarding Verification
      </h3>

      {isExtensionRequested && pendingExtension && (
        <div className="space-y-3">
          <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 text-xs">
            <p><span className="font-bold">Requested:</span> {pendingExtension.requestedDays} day(s)</p>
            <p className="mt-1"><span className="font-bold">Reason:</span> {pendingExtension.reason}</p>
          </div>
          <input
            type="number"
            min="1"
            value={grantedDays}
            onChange={(e) => setGrantedDays(e.target.value)}
            className="w-full border border-slate-300 p-2.5 rounded-lg text-sm outline-none focus:border-purple-500"
            placeholder="Days to grant"
          />
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleExtensionDecision(true)}
              className="bg-emerald-500 text-white font-bold py-2.5 rounded-lg flex justify-center items-center text-sm shadow hover:bg-emerald-600 transition disabled:opacity-50"
            >
              <CheckCircle size={16} className="mr-1.5" /> Grant
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleExtensionDecision(false)}
              className="bg-white border border-red-400 text-red-500 font-bold py-2.5 rounded-lg flex justify-center items-center text-sm hover:bg-red-50 transition disabled:opacity-50"
            >
              <XCircle size={16} className="mr-1.5" /> Reject
            </button>
          </div>
        </div>
      )}

      {isFinalReview && (
        <div className="space-y-3">
          <textarea
            className="w-full text-xs border border-slate-300 p-3 rounded-lg outline-none focus:border-purple-500 min-h-[70px]"
            placeholder="Comments (required if rejecting)"
            value={comments}
            maxLength={1000}
            onChange={(e) => setComments(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleFinalDecision(true)}
              className="bg-emerald-500 text-white font-bold py-3 rounded-xl flex justify-center items-center text-sm shadow hover:bg-emerald-600 transition disabled:opacity-50"
            >
              <CheckCircle size={16} className="mr-1.5" /> Approve & Activate
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleFinalDecision(false)}
              className="bg-white border border-red-400 text-red-500 font-bold py-3 rounded-xl flex justify-center items-center text-sm hover:bg-red-50 transition disabled:opacity-50"
            >
              <XCircle size={16} className="mr-1.5" /> Reject
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinalOnboardingReviewPanel;