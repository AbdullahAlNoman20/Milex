// admin/src/Pages/modules/sales/roles/KAM/DocumentUploadPanel.jsx — REPLACE ENTIRE FILE
import React, { useState, useRef, useCallback } from 'react';
import { UploadCloud, FileCheck2, Loader2, X } from 'lucide-react';
import { useToast } from '../../../../../Components/hooks/useToast';
import { uploadOnboardingDocuments } from '../../services/customerService';
import { DOCUMENT_TYPE_OPTIONS } from '../../constants/formOptions';
import { humanizeStatus } from '../../../../../Components/utils/format';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];

const DocumentUploadPanel = ({ customer, onUploaded }) => {
  const { showToast } = useToast();
  const [documentType, setDocumentType] = useState(DOCUMENT_TYPE_OPTIONS[0]);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef(null);

  const isAllowedExtension = (name) =>
    ALLOWED_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext));

  const addFiles = useCallback(
    (fileList) => {
      const incoming = Array.from(fileList || []);
      const accepted = [];
      for (const file of incoming) {
        if (file.size > MAX_FILE_SIZE_BYTES) {
          showToast(`${file.name} exceeds 10MB limit`, 'warning');
          continue;
        }
        if (!isAllowedExtension(file.name)) {
          showToast(`${file.name} — file type not allowed`, 'warning');
          continue;
        }
        accepted.push(file);
      }
      if (accepted.length) setPendingFiles((prev) => [...prev, ...accepted]);
    },
    [showToast]
  );

  const removePendingFile = (index) => setPendingFiles((prev) => prev.filter((_, i) => i !== index));

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer?.files);
  };

  const handleUpload = async () => {
    if (pendingFiles.length === 0) return showToast('Select at least one file to upload', 'warning');
    setIsUploading(true);
    try {
      const docs = await uploadOnboardingDocuments(customer.id, documentType, pendingFiles);
      showToast('Document(s) uploaded — pending virus scan clearance', 'success');
      onUploaded?.(docs);
      setPendingFiles([]);
    } catch (err) {
      showToast(err?.message || 'Upload failed', 'error');
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-purple-300 p-6 space-y-4">
      <h3 className="font-bold text-slate-900 text-base flex items-center">
        <UploadCloud size={18} className="mr-2 text-purple-600" /> Upload Onboarding Documents
      </h3>
      <p className="text-xs text-slate-500">
        Accepted: PDF, JPG, PNG, DOC/DOCX — max 10MB per file. Files are scanned before they're accepted.
      </p>

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1.5">Document Type</label>
        <select
          className="w-full border border-slate-200 p-2.5 rounded text-sm bg-white outline-none focus:border-purple-500"
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value)}
        >
          {DOCUMENT_TYPE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      <label
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`block border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition ${
          isDragging ? 'border-purple-500 bg-purple-50' : 'border-purple-200 hover:bg-purple-50/50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          accept={ALLOWED_EXTENSIONS.join(',')}
          disabled={isUploading}
          onChange={(e) => addFiles(e.target.files)}
        />
        <span className="text-sm font-semibold text-purple-700">
          Drag & drop files here, or click to select ({documentType})
        </span>
      </label>

      {pendingFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Selected — {documentType}</p>
          {pendingFiles.map((file, i) => (
            <div key={`${file.name}-${i}`} className="flex items-center justify-between text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5">
              <span className="truncate text-slate-700 font-medium">{file.name}</span>
              <button type="button" onClick={() => removePendingFile(i)} className="text-slate-300 hover:text-red-500 transition shrink-0 ml-2">
                <X size={14} />
              </button>
            </div>
          ))}
          <button
            type="button"
            disabled={isUploading}
            onClick={handleUpload}
            className="w-full bg-purple-600 text-white font-bold py-2.5 rounded-lg text-sm shadow hover:bg-purple-700 transition disabled:opacity-50 flex items-center justify-center"
          >
            {isUploading ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" /> Uploading...
              </>
            ) : (
              `Upload ${pendingFiles.length} File(s)`
            )}
          </button>
        </div>
      )}

      {(customer.documents || []).length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Uploaded</p>
          {customer.documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between text-xs bg-slate-50 border border-slate-200 rounded-lg p-3">
              <span className="flex items-center gap-2 text-slate-700 font-medium truncate">
                <FileCheck2 size={14} className={doc.scanStatus === 'CLEAN' ? 'text-emerald-600' : 'text-amber-500'} />
                <span className="font-bold text-purple-700">{doc.documentType || 'Other'}:</span> {doc.originalName}
              </span>
              <span
                className={`font-bold uppercase text-[9px] px-2 py-0.5 rounded shrink-0 ml-2 ${
                  doc.scanStatus === 'CLEAN'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-amber-50 text-amber-700'
                }`}
              >
                {humanizeStatus(doc.scanStatus)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DocumentUploadPanel;