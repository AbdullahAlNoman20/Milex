// admin/src/Pages/modules/sales/roles/SalesCoordinator/OfferLetterPanel.jsx — REPLACE ENTIRE FILE
import React, { useState } from 'react';
import { Mail, Printer, PenTool } from 'lucide-react';
import { useSales } from '../../hooks/useSales';
import { SIGNATURE_LIBRARY } from '../../constants/formOptions';

const OfferLetterPanel = ({ customer }) => {
  const { updateStatus, setPrintData } = useSales();
  const [offerText, setOfferText] = useState(
    customer.offerText ||
      `Based on your projected volumes, we are pleased to offer the following competitive rate:\n\n${
        customer.approvedRate || customer.proposedRate || ''
      }\n\nNotes: ${customer.lmNote || 'Standard Delivery'}\n\n${SIGNATURE_LIBRARY.LM}`
  );

  const handleSend = () => {
    updateStatus(customer.id, customer.status, { offerText }, 'OFFER LETTER SENT', `Emailed to ${customer.email}`);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-emerald-600 p-6 space-y-4">
      <h3 className="font-bold text-slate-800 text-sm flex items-center">
        <PenTool size={16} className="mr-2 text-indigo-600" /> Offer Letter
      </h3>
      <p className="text-[11px] text-slate-500">
        Customer is now a Provisional Account. Once sent, the KAM will record the customer's
        Accept/Reject feedback. If accepted, you'll then send the Agreement before document
        upload unlocks.
      </p>
      <textarea
        className="w-full text-xs font-mono border border-slate-300 p-3 rounded-lg min-h-[220px] outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed"
        value={offerText}
        maxLength={5000}
        onChange={(e) => setOfferText(e.target.value)}
      />
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setPrintData({ type: 'offer', customer: { ...customer, offerText } })}
          className="flex-1 bg-white border border-slate-300 text-slate-700 text-xs py-2.5 rounded-lg font-bold shadow-sm hover:bg-slate-50 transition flex items-center justify-center"
        >
          <Printer size={14} className="mr-1.5" /> Print
        </button>
        <button
          type="button"
          onClick={handleSend}
          className="flex-[2] bg-emerald-700 text-white text-xs py-2.5 rounded-lg font-bold shadow-md hover:bg-emerald-800 transition flex items-center justify-center"
        >
          <Mail size={14} className="mr-1.5" /> Send Offer Letter
        </button>
      </div>
    </div>
  );
};

export default OfferLetterPanel;