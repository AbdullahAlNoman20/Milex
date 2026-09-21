// admin/src/Pages/modules/sales/roles/SalesCoordinator/OfferLetterPanel.jsx
import { useState, useRef, useLayoutEffect } from 'react';
import { Printer, PenTool, Send, Loader2 } from 'lucide-react';
import { useSales } from '../../hooks/useSales';

import { useConfirm } from '../../../../../Components/hooks/useConfirm';
import { SIGNATURE_LIBRARY } from '../../constants/formOptions';
import { buildRateRefs } from '../../../../../Components/utils/format';
import { OfferLetter } from '../../components/PrintTemplate';




const OfferLetterPanel = ({ customer }) => {
  const { updateStatus, setPrintData } = useSales();
  const confirm = useConfirm();
  // The letter's wording is generated from the record rather than typed, so
  // this is read once and kept — the copy that goes out and the copy stored
  // against the customer are then guaranteed to be the same text.
  const [offerText] = useState(
    customer.offerText ||
      `Based on your projected volumes, we are pleased to offer the following competitive rate:\n\n${
        customer.approvedRate || customer.proposedRate || ''
      }\n\nRate Reference: ${buildRateRefs(customer).join(' / ')}\n\nNotes: ${customer.lmNote || 'Standard Delivery'}\n\n${SIGNATURE_LIBRARY.LM}`
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLockRef = useRef(false);
  const isResend = customer.revision > 0 && !!customer.rejectReason;

  // Letter content is 172mm (~650px) wide; scale it to fit the panel.
  const previewRef = useRef(null);
  const [scale, setScale] = useState(0.47);
  useLayoutEffect(() => {
    const el = previewRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([entry]) => setScale(Math.min(1, entry.contentRect.width / 650)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);





  const send = async (via = 'MAIL') => {
    if (submitLockRef.current) return;

    const ok = await confirm({
      title: isResend ? 'Send the revised offer letter?' : 'Send the offer letter?',
      message:
        '',
      confirmLabel: 'Record as sent',
    });
    if (!ok) return;

    submitLockRef.current = true;
    setIsSubmitting(true);
    try {
      // The letter itself is sent outside this system — printed, or emailed
      // from whatever the person already uses. What is recorded here is that
      // it went, so the customer can be moved on to their feedback.
      await updateStatus(
        customer.id,
        customer.status,
        { offerText, sentVia: via },
        'OFFER LETTER SENT',
        'Recorded as sent to the customer'
      );
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-emerald-600 p-6 space-y-4">
      <h3 className="font-bold text-slate-800 text-sm flex items-center">
        <PenTool size={16} className="mr-2 text-indigo-600" />{' '}
        {isResend ? 'Revise & Resend Offer Letter' : 'Offer Letter'}
      </h3>

      {isResend && (
        <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-xs text-red-700">
          <strong>Customer's previous feedback:</strong> {customer.rejectReason}
        </div>
      )}

      <div
        ref={previewRef}
        className="w-full max-h-[460px] overflow-y-auto overflow-x-hidden rounded-lg border border-slate-200 bg-white p-2"
      >
        <div style={{ width: '172mm', zoom: scale }}>
          <OfferLetter c={customer} />
        </div>
      </div>



      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setPrintData({ type: 'offer', customer: { ...customer, offerText } })}
          className="flex-1 bg-white border border-slate-300 text-slate-700 text-xs py-2.5 rounded-lg font-bold shadow-sm hover:bg-slate-50 transition flex items-center justify-center"
        >
          <Printer size={14} className="mr-1.5" /> Print Only
        </button>

        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => send('MAIL')}
          className="flex-[2] bg-emerald-700 text-white text-xs py-2.5 rounded-lg font-bold shadow-md hover:bg-emerald-800 transition flex items-center justify-center disabled:opacity-50"
        >
          {isSubmitting ? (
            <Loader2 size={14} className="mr-1.5 animate-spin" />
          ) : (
            <Send size={14} className="mr-1.5" />
          )}
          {isResend ? 'Resend Offer Letter' : 'Send Offer Letter'}
        </button>
      </div>

      <p className="text-[10px] text-slate-400">
        Either option records this copy against the customer and moves them on to their feedback.
      </p>
    </div>
  );
};

export default OfferLetterPanel;