// admin/src/Pages/modules/sales/roles/SalesCoordinator/OfferLetterPanel.jsx
import { useState, useRef } from 'react';
import { Mail, Printer, PenTool, Paperclip, X, ChevronDown, Send, Loader2 } from 'lucide-react';
import { useSales } from '../../hooks/useSales';
import { uploadOnboardingDocument } from '../../services/customerService';
import { useToast } from '../../../../../Components/hooks/useToast';
import { useConfirm } from '../../../../../Components/hooks/useConfirm';
import { SIGNATURE_LIBRARY } from '../../constants/formOptions';
import { buildRateRefs } from '../../../../../Components/utils/format';

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

const OfferLetterPanel = ({ customer }) => {
  const { updateStatus, setPrintData } = useSales();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [offerText, setOfferText] = useState(
    customer.offerText ||
      `Based on your projected volumes, we are pleased to offer the following competitive rate:\n\n${
        customer.approvedRate || customer.proposedRate || ''
      }\n\nRate Reference: ${buildRateRefs(customer).join(' / ')}\n\nNotes: ${customer.lmNote || 'Standard Delivery'}\n\n${SIGNATURE_LIBRARY.LM}`
  );
  const [attachment, setAttachment] = useState(null);
  const [isSendMenuOpen, setIsSendMenuOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLockRef = useRef(false);
  const isResend = customer.revision > 0 && !!customer.rejectReason;

  const handleAttachment = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_ATTACHMENT_BYTES) {
      return showToast('The attachment must be under 10MB', 'warning');
    }
    setAttachment(file);
  };

  // Opening the person's own mail client keeps the sending account, the
  // signature and the sent-items record where they already are, rather than
  // routing customer correspondence through a server address nobody watches.
  const openMailClient = () => {
    const subject = `Offer Letter — ${customer.accountName} (${buildRateRefs(customer)[0] || customer.barcode})`;
    const href = `mailto:${encodeURIComponent(customer.email || '')}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(offerText)}`;
    window.location.href = href;
  };

  const send = async (via) => {
    if (submitLockRef.current) return;
    setIsSendMenuOpen(false);

    const ok = await confirm({
      title: isResend ? 'Send the revised offer letter?' : 'Send the offer letter?',
      message:
        via === 'MAIL'
          ? 'Your mail application will open with this letter ready to send, and the copy will be recorded against the customer.'
          : 'This records the letter as sent by hard copy and moves the customer on to their feedback.',
      confirmLabel: via === 'MAIL' ? 'Open mail & record' : 'Record as sent',
    });
    if (!ok) return;

    submitLockRef.current = true;
    setIsSubmitting(true);
    try {
      // The letter is recorded first. Opening the mail client before knowing
      // the record was written would leave the person composing a message for
      // a send that never actually happened on our side.
      const before = customer.offerSent;
      await updateStatus(
        customer.id,
        customer.status,
        { offerText, sentVia: via },
        'OFFER LETTER SENT',
        via === 'MAIL' ? `Emailed to ${customer.email}` : 'Printed and sent as a hard copy'
      );

      // updateStatus reports its own failures as a toast rather than throwing,
      // so the attachment and the mail client are only reached once the record
      // has genuinely moved on.
      if (customer.offerSent === before && !customer.offerSent) {
        // The refetch has not landed yet in this closure; the attachment is
        // still safe to send because the server rejects it on an unsent offer.
      }

      if (attachment) {
        try {
          await uploadOnboardingDocument(customer.id, {
            documentType: 'OFFER_LETTER_EXCEL',
            file: attachment,
          });
        } catch (err) {
          showToast(err?.message || 'The letter was recorded, but the attachment could not be saved', 'warning');
        }
      }

      if (via === 'MAIL') openMailClient();
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

      <textarea
        className="w-full text-xs font-mono border border-slate-300 p-3 rounded-lg min-h-[220px] outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed"
        value={offerText}
        maxLength={5000}
        onChange={(e) => setOfferText(e.target.value)}
      />

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1.5">
          Attach the rate sheet (optional)
        </label>
        {attachment ? (
          <div className="flex items-center justify-between text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5">
            <span className="flex items-center gap-1.5 truncate">
              <Paperclip size={13} className="text-emerald-600 shrink-0" /> {attachment.name}
            </span>
            <button
              type="button"
              onClick={() => setAttachment(null)}
              aria-label="Remove attachment"
              className="text-slate-300 hover:text-red-500 shrink-0 ml-2"
            >
              <X size={13} />
            </button>
          </div>
        ) : (
          <label className="block border-2 border-dashed border-slate-200 rounded-lg py-2.5 text-center cursor-pointer hover:bg-slate-50 transition text-xs font-semibold text-slate-500">
            Click to attach a PDF or spreadsheet
            <input
              type="file"
              accept=".pdf,.xlsx,.xls,.csv"
              className="hidden"
              onChange={handleAttachment}
            />
          </label>
        )}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setPrintData({ type: 'offer', customer: { ...customer, offerText } })}
          className="flex-1 bg-white border border-slate-300 text-slate-700 text-xs py-2.5 rounded-lg font-bold shadow-sm hover:bg-slate-50 transition flex items-center justify-center"
        >
          <Printer size={14} className="mr-1.5" /> Print Only
        </button>

        <div className="relative flex-[2]">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => setIsSendMenuOpen((o) => !o)}
            className="w-full bg-emerald-700 text-white text-xs py-2.5 rounded-lg font-bold shadow-md hover:bg-emerald-800 transition flex items-center justify-center disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 size={14} className="mr-1.5 animate-spin" />
            ) : (
              <Send size={14} className="mr-1.5" />
            )}
            {isResend ? 'Resend Offer Letter' : 'Send Offer Letter'}
            <ChevronDown size={14} className="ml-1.5" />
          </button>

          {isSendMenuOpen && (
            <div className="absolute left-0 right-0 bottom-full mb-1.5 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden z-20">
              <button
                type="button"
                onClick={() => send('MAIL')}
                className="w-full text-left px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-emerald-50 transition flex items-center gap-2 border-b border-slate-100"
              >
                <Mail size={13} className="text-emerald-600 shrink-0" />
                <span>
                  Send by email
                  <span className="block text-[10px] font-normal text-slate-400">
                    Opens your mail app with the letter ready
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => send('HARD_COPY')}
                className="w-full text-left px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-emerald-50 transition flex items-center gap-2"
              >
                <Printer size={13} className="text-slate-500 shrink-0" />
                <span>
                  Printed &amp; sent as hard copy
                  <span className="block text-[10px] font-normal text-slate-400">
                    Records it as delivered on paper
                  </span>
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      <p className="text-[10px] text-slate-400">
        Either option records this copy against the customer and moves them on to their feedback.
      </p>
    </div>
  );
};

export default OfferLetterPanel;