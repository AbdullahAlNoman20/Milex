// src/Pages/modules/sales/components/PrintTemplate.jsx
import React from 'react';
import { Printer } from 'lucide-react';
import { escapeHtml } from '../../../../Components/utils/sanitize';

const PrintTemplate = ({ data, onClose }) => {
  if (!data) return null;
  const c = data.customer;

  return (
    <div className="fixed inset-0 z-50 bg-slate-800 overflow-y-auto p-8 flex flex-col items-center">
      <div className="print:hidden w-full max-w-4xl bg-slate-900 rounded-lg p-4 flex justify-between items-center mb-6 shadow-xl">
        <p className="text-white font-bold text-sm">Document Print Preview</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-700 text-white px-5 py-2 rounded text-xs font-bold hover:bg-slate-600 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="bg-emerald-600 text-white px-5 py-2 rounded text-xs font-bold shadow-md hover:bg-emerald-700 transition flex items-center"
          >
            <Printer size={14} className="mr-2" /> Print Document
          </button>
        </div>
      </div>

      <div className="bg-white w-full max-w-[210mm] min-h-[297mm] text-black p-12 shadow-2xl relative print:shadow-none print:m-0">
        <div className="flex justify-between items-end border-b-2 border-slate-800 pb-4 mb-8">
          <h1 className="text-4xl font-black text-emerald-800 italic tracking-tighter">MILEX</h1>
          <p className="text-right text-xs text-slate-600 mt-2 font-mono bg-slate-100 px-2 py-1 inline-block border font-bold text-slate-800">
            ID: {escapeHtml(c.barcode)}
          </p>
        </div>

        {data.type === 'offer' && (
          <div className="space-y-4 text-sm whitespace-pre-wrap leading-relaxed">{c.offerText}</div>
        )}

        {data.type === 'agreement' && (
          <div className="space-y-4 text-sm whitespace-pre-wrap leading-relaxed">{c.agreementText}</div>
        )}

        {(data.type === 'recommendation' || data.type === 'profile') && (
          <div className="text-center mt-20">
            <h2 className="text-2xl font-bold">
              {data.type === 'profile' ? 'Master Profile' : 'Recommendation'} Form Printout
            </h2>
            {c.accountProfileType === 'PROVISIONAL' && (
              <p className="text-red-600 font-bold mt-4">PROVISIONAL ACCOUNT</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PrintTemplate;