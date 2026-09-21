// admin/src/Pages/modules/sales/roles/KAM/KamRateDecisionPanel.jsx
import { useState, useRef } from 'react';
import { Send, TrendingDown, Loader2 } from 'lucide-react';
import { sendForOfferLetter, requestBetterRate } from '../../services/customerService';
import { useToast } from '../../../../../Components/hooks/useToast';
import { useConfirm } from '../../../../../Components/hooks/useConfirm';
import { isRequired } from '../../../../../Components/utils/validators';
import { rateSourceLabel } from '../../../../../Components/utils/format';

// The rate is on the table and nothing has reached the customer. The KAM owns
// this call, because they are the one who knows whether the number will land.
const KamRateDecisionPanel = ({ customer, onUpdated }) => {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [tab, setTab] = useState('send');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const lockRef = useRef(false);

  const handleSend = async () => {
    if (lockRef.current) return;
    const ok = await confirm({
      title: 'Send this rate for an offer letter?',
      message: ``,
      confirmLabel: 'Send to Sales Coordinator',
    });
    if (!ok) return;

    lockRef.current = true;
    setIsSubmitting(true);
    try {
      await sendForOfferLetter(customer.id);
      showToast('Sent to the Sales Coordinator', 'success');
      onUpdated?.();
    } catch (err) {
      showToast(err?.message || 'Could not send it on', 'error');
    } finally {
      lockRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleRequest = async () => {
    if (lockRef.current) return;
    if (!isRequired(reason)) return showToast('Explain why a better rate is needed', 'warning');
    const ok = await confirm({
      title: 'Ask for a better rate?',
      message: '',
      confirmLabel: 'Send request',
    });
    if (!ok) return;

    lockRef.current = true;
    setIsSubmitting(true);
    try {
      await requestBetterRate(customer.id, reason.trim());
      showToast('Sent back to your Line Manager', 'success');
      setReason('');
      onUpdated?.();
    } catch (err) {
      showToast(err?.message || 'Could not send the request', 'error');
    } finally {
      lockRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-emerald-600 p-6 space-y-4">
      <h3 className="font-bold text-slate-900 text-base">Your Decision on This Rate</h3>

      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 mb-1">
          Rate on the table
        </p>
        <p className="text-sm font-bold text-slate-800 break-words">{customer.approvedRate || '—'}</p>
        <p className="text-[11px] text-slate-500 mt-1">
          Given by: <strong>{rateSourceLabel(customer.rateSource)}</strong>
        </p>
        {customer.lmNote && (
          <p className="text-[11px] text-slate-600 mt-1.5 break-words">Note: {customer.lmNote}</p>
        )}
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setTab('send')}
          className={`px-4 py-2 text-xs font-bold border-b-2 -mb-px transition ${
            tab === 'send'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Send for Offer Letter
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
          Request a Better Rate
        </button>
      </div>

      {tab === 'send' ? (
        <div className="space-y-3">
          <p className="text-xs text-slate-500 leading-relaxed">
            The Sales Coordinator prepares the offer letter and sends it to the customer. Nothing
            has reached them yet.
          </p>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSend}
            className="w-full bg-emerald-700 text-white font-bold py-3 rounded-xl flex justify-center items-center text-sm shadow hover:bg-emerald-800 transition disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 size={16} className="mr-1.5 animate-spin" />
            ) : (
              <Send size={16} className="mr-1.5" />
            )}
            Send to Sales Coordinator
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <textarea
            className="w-full text-xs border border-slate-300 p-3 rounded-lg outline-none focus:border-indigo-500 min-h-[90px]"
            placeholder=""
            value={reason}
            maxLength={1000}
            onChange={(e) => setReason(e.target.value)}
          />
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleRequest}
            className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl flex justify-center items-center text-sm shadow hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 size={16} className="mr-1.5 animate-spin" />
            ) : (
              <TrendingDown size={16} className="mr-1.5" />
            )}
            Send Back to Line Manager
          </button>
        </div>
      )}
    </div>
  );
};

export default KamRateDecisionPanel;