// admin/src/Pages/modules/sales/roles/SalesCoordinator/OfferLetterPanel.jsx 
import React, { useState } from 'react';
import { Mail, Printer, PenTool, FileSpreadsheet, X } from 'lucide-react';
import { useSales } from '../../hooks/useSales';
import { uploadOnboardingDocument } from '../../services/customerService';
import { useToast } from '../../../../../Components/hooks/useToast';
import { SIGNATURE_LIBRARY } from '../../constants/formOptions';

const OfferLetterPanel = ({ customer }) => {
  const { updateStatus } = useSales();
  const { showToast } = useToast();
  const [offerText, setOfferText] = useState(
    customer.offerText ||
      `Based on your projected volumes, we are pleased to offer the following competitive rate:\n\n${
        customer.approvedRate || customer.proposedRate || ''
      }\n\nNotes: ${customer.lmNote || 'Standard Delivery'}\n\n${SIGNATURE_LIBRARY.LM}`
  );
  const [excelFile, setExcelFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isResend = customer.revision > 0 && !!customer.rejectReason;

  const handleSend = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await updateStatus(customer.id, customer.status, { offerText }, 'OFFER LETTER SENT', `Emailed to ${customer.email}`);
      if (excelFile) {
        await uploadOnboardingDocument(customer.id, { documentType: 'OFFER_LETTER_EXCEL', file: excelFile });
      }
      showToast('Offer letter sent', 'success');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-emerald-600 p-6 space-y-4">
      <h3 className="font-bold text-slate-800 text-sm flex items-center">
        <PenTool size={16} className="mr-2 text-indigo-600" /> {isResend ? 'Revise & Resend Offer Letter' : 'Offer Letter'}
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
        <label className="block text-xs font-bold text-slate-700 mb-1.5">Attach Rate/Volume Excel (optional)</label>
        {excelFile ? (
          <div className="flex items-center justify-between text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5">
            <span className="flex items-center gap-1.5 truncate"><FileSpreadsheet size={13} className="text-emerald-600 shrink-0" /> {excelFile.name}</span>
            <button type="button" onClick={() => setExcelFile(null)} className="text-slate-300 hover:text-red-500 shrink-0 ml-2"><X size={13} /></button>
          </div>
        ) : (
          <label className="block border-2 border-dashed border-slate-200 rounded-lg py-2.5 text-center cursor-pointer hover:bg-slate-50 transition text-xs font-semibold text-slate-500">
            Click to attach .xlsx / .csv
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => setExcelFile(e.target.files?.[0] || null)} />
          </label>
        )}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleSend}
          className="w-full bg-emerald-700 text-white text-xs py-2.5 rounded-lg font-bold shadow-md hover:bg-emerald-800 transition flex items-center justify-center disabled:opacity-50"
        >
          <Mail size={14} className="mr-1.5" /> {isResend ? 'Resend Offer Letter' : 'Send Offer Letter'}
        </button>
      </div>
    </div>
  );
};

export default OfferLetterPanel;