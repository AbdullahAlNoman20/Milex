// admin/src/Pages/modules/sales/roles/KAM/DocumentUploadPanel.jsx
import React, { useState, useCallback } from 'react';
import { Loader2, UploadCloud, Printer, Eye, Send, FileCheck } from 'lucide-react';
import { useToast } from '../../../../../Components/hooks/useToast';
import { uploadOnboardingDocument, getDocumentSignedUrl, submitFinalOnboarding } from '../../services/customerService';
import { useSales } from '../../hooks/useSales';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const DOCUMENT_CATEGORIES = [
  { key: 'SIGNED_OFFER_LETTER', label: 'Signed Offer Letter (Customer Copy)', hasMeta: false },
  { key: 'OFFER_RATE_RECEIPT', label: 'Signed Offer & Rate Receipt (Hard Copy Scan)', hasMeta: false },
  { key: 'SIGNED_AGREEMENT', label: 'Signed Agreement', hasMeta: false },
  { key: 'CUSTOMER_TIN', label: 'Customer TIN', hasMeta: true },
  { key: 'CUSTOMER_BIN', label: 'Customer BIN', hasMeta: true },
  { key: 'TRADE_LICENSE', label: 'Trade License', hasMeta: true },
  { key: 'OTHERS', label: 'Others Document', hasMeta: true },
];

const CategoryCard = ({ category, doc, onUpload, isUploading }) => {
  const { showToast } = useToast();
  const [number, setNumber] = useState(doc?.documentNumber || '');
  const [expiry, setExpiry] = useState(doc?.expiryDate ? doc.expiryDate.slice(0, 10) : '');
  const [isOpening, setIsOpening] = useState(false);
  const inputId = `doc-upload-${category.key}`;

  const handleView = async () => {
    if (!doc) return;
    if (doc.scanStatus !== 'CLEAN') return showToast('This file is still being scanned — try again shortly', 'warning');
    setIsOpening(true);
    try {
      const url = await getDocumentSignedUrl(doc.storageKey);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      showToast(err?.message || 'Could not open file', 'error');
    } finally {
      setIsOpening(false);
    }
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE_BYTES) {
      e.target.value = '';
      return showToast('File exceeds 10MB limit', 'warning');
    }
    onUpload(category.key, file, number, expiry);
    e.target.value = '';
  };

  return (
    <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
      <div>
        <p className="text-sm font-bold text-slate-800">{category.label}</p>
        <p className="text-[10px] text-slate-400 mt-0.5">{doc ? 'Uploaded' : 'Pending upload'}</p>
      </div>

      <label
        htmlFor={inputId}
        className="block border-2 border-dashed border-emerald-200 rounded-lg py-4 text-center cursor-pointer hover:bg-emerald-50/50 transition text-xs font-semibold text-emerald-700"
      >
        {isUploading ? (
          <span className="flex items-center justify-center">
            <Loader2 size={14} className="mr-2 animate-spin" /> Uploading...
          </span>
        ) : (
          <span className="flex items-center justify-center">
            <UploadCloud size={14} className="mr-2" /> {doc ? 'Replace File' : 'Upload File'}
          </span>
        )}
        <input id={inputId} type="file" className="hidden" disabled={isUploading} onChange={handleFile} />
      </label>

      {doc && (
        <button
          type="button"
          onClick={handleView}
          disabled={isOpening}
          className="w-full flex items-center justify-between gap-1.5 text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 hover:bg-slate-100 transition disabled:opacity-50"
        >
          <span className="truncate">{doc.originalName}</span>
          {isOpening ? <Loader2 size={12} className="animate-spin shrink-0" /> : <Eye size={12} className="shrink-0 text-emerald-600" />}
        </button>
      )}

      {category.hasMeta && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Number</label>
            <input
              className="w-full border border-slate-200 p-1.5 rounded text-xs outline-none focus:border-emerald-500"
              value={number}
              maxLength={100}
              onChange={(e) => setNumber(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Expiry Date</label>
            <input
              type="date"
              className="w-full border border-slate-200 p-1.5 rounded text-xs outline-none focus:border-emerald-500"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const AutoTextCard = ({ title, text, printType, customer, emptyLabel }) => {
  const { setPrintData } = useSales();
  return (
    <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
      <div>
        <p className="text-sm font-bold text-slate-800">{title}</p>
        <p className="text-[10px] text-slate-400 mt-0.5">{text ? 'Auto-added' : emptyLabel}</p>
      </div>
      {text ? (
        <button
          type="button"
          onClick={() => setPrintData({ type: printType, customer })}
          className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg py-2.5 hover:bg-emerald-100 transition"
        >
          <Eye size={13} /> View {title}
        </button>
      ) : (
        <div className="border-2 border-dashed border-slate-200 rounded-lg py-4 text-center text-xs text-slate-400">Not available yet</div>
      )}
    </div>
  );
};

const OfferLetterAutoCard = ({ customer }) => {
  const { setPrintData } = useSales();
  return (
    <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
      <div>
        <p className="text-sm font-bold text-slate-800">Offer Letter</p>
        <p className="text-[10px] text-slate-400 mt-0.5">
          {customer.offerText ? 'Auto-added from the Offer Letter sent by Sales Coordinator' : 'Pending — offer letter not sent yet'}
        </p>
      </div>
      {customer.offerText ? (
        <button
          type="button"
          onClick={() => setPrintData({ type: 'offer', customer })}
          className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg py-2.5 hover:bg-emerald-100 transition"
        >
          <Eye size={13} /> View Offer Letter
        </button>
      ) : (
        <div className="border-2 border-dashed border-slate-200 rounded-lg py-4 text-center text-xs text-slate-400">
          Not available yet
        </div>
      )}
    </div>
  );
};

const REQUIRED_DOC_TYPES = ['SIGNED_OFFER_LETTER', 'SIGNED_AGREEMENT', 'CUSTOMER_TIN', 'CUSTOMER_BIN', 'TRADE_LICENSE'];

const DocumentUploadPanel = ({ customer, onUploaded, embedded = false }) => {
  const { showToast } = useToast();
  const { setPrintData } = useSales();
  const [uploadingKey, setUploadingKey] = useState(null);
  const [isSubmittingFinal, setIsSubmittingFinal] = useState(false);

  const docsByType = (customer.documents || []).reduce((acc, d) => {
    acc[d.documentType] = d;
    return acc;
  }, {});

  const handleUpload = useCallback(
    async (documentType, file, documentNumber, expiryDate) => {
      setUploadingKey(documentType);
      try {
        await uploadOnboardingDocument(customer.id, { documentType, documentNumber, expiryDate, file });
        showToast('Document uploaded — pending virus scan clearance', 'success');
        onUploaded?.();
      } catch (err) {
        showToast(err?.message || 'Upload failed', 'error');
      } finally {
        setUploadingKey(null);
      }
    },
    [customer.id, showToast, onUploaded]
  );

  const missingRequired = REQUIRED_DOC_TYPES.filter((key) => !docsByType[key]);
  const hasAnyDocs = (customer.documents || []).length > 0;

  const handleSubmitFinal = async () => {
    if (isSubmittingFinal) return;
    setIsSubmittingFinal(true);
    try {
      await submitFinalOnboarding(customer.id);
      showToast('Submitted for Final Onboarding — awaiting Line Manager verification', 'success');
      onUploaded?.();
    } catch (err) {
      showToast(err?.message || 'Submission failed', 'error');
    } finally {
      setIsSubmittingFinal(false);
    }
  };

  return (
    <div className={embedded ? 'space-y-4' : 'bg-white rounded-xl shadow-sm border border-purple-300 p-6 space-y-4'}>
      <div className="flex justify-between items-start gap-3">
        <div>
          <h3 className="font-bold text-slate-900 text-base">Supporting Documentation & Profile</h3>
          <p className="text-xs text-slate-500 mt-1">
            Upload PDF, image, or Word files for each category. Maximum file size 10MB.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPrintData({ type: 'profile', customer })}
          className="text-emerald-600 text-xs font-bold flex items-center bg-emerald-50 px-3 py-1.5 rounded-md border border-emerald-100 hover:bg-emerald-100 transition shrink-0"
        >
          <Printer size={14} className="mr-1.5" /> Print Profile
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <OfferLetterAutoCard customer={customer} />
        <AutoTextCard title="Agreement" text={customer.agreementText} printType="agreement" customer={customer} emptyLabel="Pending — agreement not sent yet" />
        {DOCUMENT_CATEGORIES.map((cat) => (
          <CategoryCard
            key={cat.key}
            category={cat}
            doc={docsByType[cat.key]}
            onUpload={handleUpload}
            isUploading={uploadingKey === cat.key}
          />
        ))}
      </div>

      {!embedded && (
        <div className="pt-4 border-t border-slate-100 space-y-2">
          {missingRequired.length > 0 && (
            <p className="text-[11px] text-amber-600 font-semibold">
              Still needed: {missingRequired.map((k) => k.replace(/_/g, ' ')).join(', ')}
            </p>
          )}
          <button
            type="button"
            disabled={!hasAnyDocs || isSubmittingFinal}
            onClick={handleSubmitFinal}
            className="w-full bg-emerald-700 text-white font-bold py-3 rounded-lg text-sm shadow-md hover:bg-emerald-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isSubmittingFinal ? <Loader2 size={16} className="mr-2 animate-spin" /> : <FileCheck size={16} className="mr-2" />}
            Submit for Final Onboarding
          </button>
        </div>
      )}
    </div>
  );
};

export default DocumentUploadPanel;