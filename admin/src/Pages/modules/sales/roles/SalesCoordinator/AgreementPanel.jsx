// admin/src/Pages/modules/sales/roles/SalesCoordinator/AgreementPanel.jsx
import { useState, useRef, useLayoutEffect } from 'react';
import { Printer, PenTool, Send, Loader2 } from 'lucide-react';
import { sendAgreement } from '../../services/customerService';
import { useToast } from '../../../../../Components/hooks/useToast';
import { useConfirm } from '../../../../../Components/hooks/useConfirm';
import { useSales } from '../../hooks/useSales';
import { SIGNATURE_LIBRARY } from '../../constants/formOptions';
import { buildRateRefs } from '../../../../../Components/utils/format';
import { AgreementLetter } from '../../components/PrintTemplate';
import { composeMailWithLetter } from '../../components/letterPdf';

const AgreementPanel = ({ customer, onSent }) => {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const { setPrintData } = useSales();
  const agreementText =
    customer.agreementText ||
    `This agreement is made between MILEX and ${customer.accountName}.\n\nThe customer agrees to the rates defined in Annexure ${customer.rateRef || ''}${
      customer.accountType === 'CASH'
        ? ' on a cash basis.'
        : ` with a credit limit of BDT ${customer.creditLimitTk}.`
    }\n\n${SIGNATURE_LIBRARY.SALES}`;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLockRef = useRef(false);

  // Letter content is 169.4mm (~640px) wide; scale it to fit the panel.
  const previewRef = useRef(null);
  const [scale, setScale] = useState(0.47);
  useLayoutEffect(() => {
    const el = previewRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([entry]) => setScale(Math.min(1, entry.contentRect.width / 640)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Same approach as the offer letter: the PDF is produced and downloaded,
  // then the compose window opens ready for it. A mailto: link cannot carry
  // an attachment, so the download is the only honest way to get the file
  // into the message.
  const openMailClient = async () => {
    const ref = buildRateRefs(customer)[0] || customer.barcode;
    const fileName = `Agreement-${customer.accountName.replace(/[^a-zA-Z0-9]+/g, '-')}-${ref}.pdf`;

    const prepared = await composeMailWithLetter({
      node: <AgreementLetter c={customer} />,
      kind: 'agreement',
      fileName,
      widthMm: 169.4,
      to: customer.email,
      subject: `Agreement — ${customer.accountName} (${ref})`,
      body: `Dear ${customer.accountName},\n\nPlease find our agreement attached for your signature.\n\nReference: ${ref}\n\nKind regards,\nMILEX`,
    });

    showToast(
      prepared
        ? `Your email is open and the agreement is ready as "${fileName}" — drag it in or use the paperclip.`
        : 'The email opened, but the agreement could not be prepared. Use Print Only to produce it.',
      prepared ? 'info' : 'warning',
      10000
    );
  };

  const send = async (via) => {
    if (submitLockRef.current) return;

    const ok = await confirm({
      title: 'Send the agreement?',
      message:
        via === 'MAIL'
          ? 'Your mail application will open with the agreement ready to send, and the copy will be recorded against the customer.'
          : 'This records the agreement as sent by hard copy and unlocks the document upload.',
      confirmLabel: via === 'MAIL' ? 'Open mail & record' : 'Record as sent',
    });
    if (!ok) return;

    submitLockRef.current = true;
    setIsSubmitting(true);
    try {
      // Recorded first: opening the mail client before knowing the copy was
      // written would leave someone composing a message for a send that
      // never happened on our side.
      await sendAgreement(customer.id, agreementText, via);
      showToast('Agreement recorded', 'success');
      if (via === 'MAIL') await openMailClient();
      onSent?.();
    } catch (err) {
      showToast(err?.message || 'Failed to send agreement', 'error');
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-blue-600 p-6 space-y-4">
      <h3 className="font-bold text-slate-800 text-sm flex items-center">
        <PenTool size={16} className="mr-2 text-blue-600" /> Agreement
      </h3>
      <p className="text-[11px] text-slate-500">
        The customer accepted the offer. Once the agreement is sent, a signed hard copy is
        collected and uploaded under "Signed Agreement", which unlocks the rest of the documents.
      </p>

      <div
        ref={previewRef}
        className="w-full max-h-[460px] overflow-y-auto overflow-x-hidden rounded-lg border border-slate-200 bg-white p-2"
      >
        <div style={{ width: '169.4mm', zoom: scale }}>
          <AgreementLetter c={customer} />
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setPrintData({ type: 'agreement', customer })}
          className="flex-1 bg-white border border-slate-300 text-slate-700 text-xs py-2.5 rounded-lg font-bold shadow-sm hover:bg-slate-50 transition flex items-center justify-center"
        >
          <Printer size={14} className="mr-1.5" /> Print Only
        </button>

        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => send('MAIL')}
          className="flex-[2] bg-blue-700 text-white text-xs py-2.5 rounded-lg font-bold shadow-md hover:bg-blue-800 transition flex items-center justify-center disabled:opacity-50"
        >
          {isSubmitting ? (
            <Loader2 size={14} className="mr-1.5 animate-spin" />
          ) : (
            <Send size={14} className="mr-1.5" />
          )}
          Send Agreement
        </button>
      </div>
    </div>
  );
};

export default AgreementPanel;