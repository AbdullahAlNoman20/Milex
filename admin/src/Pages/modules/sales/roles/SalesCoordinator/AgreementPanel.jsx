// admin/src/Pages/modules/sales/roles/SalesCoordinator/AgreementPanel.jsx — REPLACE ENTIRE FILE
import React, { useState } from 'react';
import { Mail, Printer, PenTool } from 'lucide-react';
import { sendAgreement } from '../../services/customerService';
import { useToast } from '../../../../../Components/hooks/useToast';
import { useSales } from '../../hooks/useSales';
import { SIGNATURE_LIBRARY } from '../../constants/formOptions';

const AgreementPanel = ({ customer, onSent }) => {
  const { showToast } = useToast();
  const { setPrintData } = useSales();
  const [agreementText, setAgreementText] = useState(
    customer.agreementText ||
      `This agreement is made between MILEX and ${customer.accountName}.\n\nThe customer agrees to the rates defined in Annexure ${customer.rateRef || ''} with a credit limit of BDT ${customer.creditLimitTk}.\n\n${SIGNATURE_LIBRARY.SALES}`
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSend = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await sendAgreement(customer.id, agreementText);
      showToast('Agreement sent to customer', 'success');
      onSent?.();
    } catch (err) {
      showToast(err?.message || 'Failed to send agreement', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-blue-600 p-6 space-y-4">
      <h3 className="font-bold text-slate-800 text-sm flex items-center">
        <PenTool size={16} className="mr-2 text-blue-600" /> Agreement
      </h3>
      <p className="text-[11px] text-slate-500">
        Customer accepted the offer. Send the Service Level Agreement — this unlocks document
        upload for the KAM.
      </p>
      <textarea
        className="w-full text-xs font-mono border border-slate-300 p-3 rounded-lg min-h-[220px] outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed"
        value={agreementText}
        maxLength={5000}
        onChange={(e) => setAgreementText(e.target.value)}
      />
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setPrintData({ type: 'agreement', customer: { ...customer, agreementText } })}
          className="flex-1 bg-white border border-slate-300 text-slate-700 text-xs py-2.5 rounded-lg font-bold shadow-sm hover:bg-slate-50 transition flex items-center justify-center"
        >
          <Printer size={14} className="mr-1.5" /> Print
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleSend}
          className="flex-[2] bg-blue-700 text-white text-xs py-2.5 rounded-lg font-bold shadow-md hover:bg-blue-800 transition flex items-center justify-center disabled:opacity-50"
        >
          <Mail size={14} className="mr-1.5" /> Send Agreement
        </button>
      </div>
    </div>
  );
};

export default AgreementPanel;