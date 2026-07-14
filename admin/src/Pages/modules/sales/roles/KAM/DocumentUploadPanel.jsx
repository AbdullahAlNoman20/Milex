// admin/src/Pages/modules/sales/roles/KAM/DocumentUploadPanel.jsx
import React, { useState, useCallback } from 'react';
import { Loader2, UploadCloud, Printer, Eye } from 'lucide-react';
import { useToast } from '../../../../../Components/hooks/useToast';
import { uploadOnboardingDocument, getDocumentSignedUrl } from '../../services/customerService';
import { useSales } from '../../hooks/useSales';
import { humanizeStatus } from '../../../../../Components/utils/format';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const DOCUMENT_CATEGORIES = [
  { key: 'OFFER_LETTER', label: 'Offer Letter', hasMeta: false },
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
    if (doc.scanStatus !== 'CLEAN') {
      return showToast('This file is still being scanned — try again shortly', 'warning');
    }
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
      return;
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

const DocumentUploadPanel = ({ customer, onUploaded }) => {
  const { showToast } = useToast();
  const { setPrintData } = useSales();
  const [uploadingKey, setUploadingKey] = useState(null);

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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-purple-300 p-6 space-y-4">
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
    </div>
  );
};

export default DocumentUploadPanel;