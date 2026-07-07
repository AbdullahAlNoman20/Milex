// src/Pages/modules/sales/roles/SalesCoordinator/AgreementPanel.jsx
import React, { useState } from 'react';
import { Mail, Printer, PenTool } from 'lucide-react';
import { useSales } from '../../hooks/useSales';
import { STATUS } from '../../constants/salesStatus';
import { SIGNATURE_LIBRARY } from '../../constants/formOptions';
import { sanitizeText } from '../../../../../Components/utils/sanitize';

const AgreementPanel = ({ customer }) => {
  const { updateStatus, setPrintData } = useSales();
  const [agreementText, setAgreementText] = useState(
    customer.agreementText ||
      `This agreement is made between MILEX and ${customer.accountName}.\n\nThe customer agrees to the rates defined in Annexure ${customer.rateRef} with a credit limit of BDT ${customer.creditLimitTk}.\n\n${SIGNATURE_LIBRARY.SALES}`
  );

  const handleDraft = () => updateStatus(customer.id, STATUS.AGREEMENT_DRAFTING, {}, 'DRAFTING AGREEMENT', 'SC editing SLA clauses');

  const handleFinalize = () => {
    updateStatus(
      customer.id,
      STATUS.AGREEMENT_REVIEW,
      { agreementText: sanitizeText(agreementText, { maxLength: 5000 }) },
      'AGREEMENT FINALIZED',
      'Awaiting signature'
    );
  };

  if (customer.status === STATUS.PENDING_AGREEMENT) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-blue-600 p-6 space-y-4 text-center">
        <p className="text-[11px] font-bold text-slate-700 uppercase tracking-widest leading-relaxed">
          Offer accepted. Prepare the Service Level Agreement.
        </p>
        <button
          type="button"
          onClick={handleDraft}
          className="w-full bg-blue-700 text-white text-sm py-3.5 rounded-lg font-bold shadow-md hover:bg-blue-800 transition"
        >
          Generate Agreement
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-blue-600 p-6 space-y-4">
      <h3 className="font-bold text-slate-800 text-sm flex items-center">
        <PenTool size={16} className="mr-2 text-blue-600" /> Edit Agreement (SLA)
      </h3>
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
          onClick={handleFinalize}
          className="flex-[2] bg-blue-700 text-white text-xs py-2.5 rounded-lg font-bold shadow-md hover:bg-blue-800 transition flex items-center justify-center"
        >
          <Mail size={14} className="mr-1.5" /> Finalize & Send
        </button>
      </div>
    </div>
  );
};

export default AgreementPanel;