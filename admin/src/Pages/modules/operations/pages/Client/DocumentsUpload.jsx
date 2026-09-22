// src/Pages/modules/operations/pages/Client/DocumentsUpload.jsx
import { useState, useEffect, useCallback } from 'react';
import { FileCheck2, UploadCloud, Eye, X } from 'lucide-react';
import SectionCard from '../../components/SectionCard';
import Loader from '../../../../../Components/Shared/Loader';
import { useOperationsAuth } from '../../hooks/useOperationsAuth';
import { useToast } from '../../../../../Components/hooks/useToast';
import { fetchShipmentsByClientEmail, updateShipmentDocumentFile } from '../../services/shipmentService';
import { DOCUMENT_CHECKLIST } from '../../constants/shipmentFields';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB cap for demo/localStorage-backed storage
const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });

const DocumentsUpload = () => {
  const { currentUser } = useOperationsAuth();
  const { showToast } = useToast();
  const [shipments, setShipments] = useState([]);
  const [selectedAwb, setSelectedAwb] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [busyDoc, setBusyDoc] = useState(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const records = await fetchShipmentsByClientEmail(currentUser?.email);
      setShipments(records);
      setSelectedAwb((prev) => prev || (records[0] ? records[0].awbNumber : ''));
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { load(); }, [load]);

  const selected = shipments.find((s) => s.awbNumber === selectedAwb);
  const uploadedFiles = selected?.documentFiles || {};

  const handleFileChange = async (doc, e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !selected) return;

    if (file.size > MAX_FILE_SIZE) {
      showToast('File is too large — please upload a file under 2MB', 'warning');
      return;
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      showToast('Only PDF, JPG, or PNG files are accepted', 'warning');
      return;
    }

    setBusyDoc(doc);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      await updateShipmentDocumentFile(selected.awbNumber, doc, {
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl,
        uploadedAt: new Date().toISOString(),
      });
      showToast(`${doc} uploaded successfully`);
      await load();
    } catch (err) {
      showToast(err?.message || 'Failed to upload file', 'error');
    } finally {
      setBusyDoc(null);
    }
  };

  const handleRemove = async (doc) => {
    if (!selected) return;
    setBusyDoc(doc);
    try {
      await updateShipmentDocumentFile(selected.awbNumber, doc, null);
      showToast(`${doc} removed`);
      await load();
    } catch (err) {
      showToast(err?.message || 'Failed to remove file', 'error');
    } finally {
      setBusyDoc(null);
    }
  };

  const handleView = (doc) => {
    const file = uploadedFiles[doc];
    if (!file?.dataUrl) return;
    const win = window.open();
    if (win) {
      win.document.write(
        file.type === 'application/pdf'
          ? `<iframe src="${file.dataUrl}" style="width:100%;height:100vh;border:none;"></iframe>`
          : `<img src="${file.dataUrl}" style="max-width:100%;" />`
      );
    }
  };

  if (isLoading) return <Loader label="Loading your shipments..." />;

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-4 md:p-0">
      <div>
        <h1 className="text-xl font-black text-slate-800">Documents Upload</h1>
        <p className="text-sm text-slate-500">Upload trade documents (PDF, JPG, or PNG — max 2MB) for a shipment.</p>
      </div>

      {shipments.length === 0 ? (
        <SectionCard title="No Shipments Found">
          <p className="text-sm text-slate-400">Book a shipment first via Import / Export Request before uploading documents.</p>
        </SectionCard>
      ) : (
        <>
          <SectionCard title="Select Shipment">
            <select value={selectedAwb} onChange={(e) => setSelectedAwb(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-50 focus:border-emerald-500 outline-none">
              {shipments.map((s) => (
                <option key={s.awbNumber} value={s.awbNumber}>{s.awbNumber} — {s.shipmentMode} — {s.statusLabel}</option>
              ))}
            </select>
          </SectionCard>

          <SectionCard title="Document Checklist" subtitle={`For AWB ${selectedAwb}`}>
            <div className="space-y-2">
              {DOCUMENT_CHECKLIST.map((doc) => {
                const file = uploadedFiles[doc];
                return (
                  <div key={doc} className="flex flex-wrap items-center justify-between gap-2 border border-slate-100 rounded-lg p-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {file ? <FileCheck2 size={16} className="text-emerald-600 shrink-0" /> : <UploadCloud size={16} className="text-amber-500 shrink-0" />}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{doc}</p>
                        {file && <p className="text-[10px] text-slate-400 truncate">{file.name}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {file ? (
                        <>
                          <button type="button" onClick={() => handleView(doc)} className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:underline">
                            <Eye size={13} /> View
                          </button>
                          <button type="button" disabled={busyDoc === doc} onClick={() => handleRemove(doc)} className="flex items-center gap-1 text-xs font-bold text-red-500 hover:underline disabled:opacity-50">
                            <X size={13} /> Remove
                          </button>
                        </>
                      ) : (
                        <label className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:underline cursor-pointer">
                          <UploadCloud size={14} /> {busyDoc === doc ? 'Uploading...' : 'Upload'}
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            className="hidden"
                            disabled={busyDoc === doc}
                            onChange={(e) => handleFileChange(doc, e)}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
};

export default DocumentsUpload;