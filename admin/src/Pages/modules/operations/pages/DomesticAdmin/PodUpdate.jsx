// src/Pages/modules/operations/pages/DomesticAdmin/PodUpdate.jsx
// (Re-exported verbatim as ForeignAdmin/PodUpdate.jsx)
import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import SectionCard from '../../components/SectionCard';
import { updateShipmentPod } from '../../services/shipmentService';
import { useOperationsAuth } from '../../hooks/useOperationsAuth';
import { useToast } from '../../../../../Components/hooks/useToast';
import { isRequired } from '../../../../../Components/utils/validators';

const PodUpdate = () => {
  const { currentUser } = useOperationsAuth();
  const { showToast } = useToast();

  const [awbNumber, setAwbNumber] = useState('');
  const [receivedBy, setReceivedBy] = useState('');
  const [signatureText, setSignatureText] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedAwb, setSavedAwb] = useState(null);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!isRequired(awbNumber)) return showToast('AWB / CN Number is required', 'warning');
      if (!isRequired(deliveryDate)) return showToast('Delivery Date is required', 'warning');
      if (!isRequired(receivedBy)) return showToast('Received By is required', 'warning');
      if (!isRequired(signatureText)) return showToast('Signature (typed name) is required', 'warning');

      setIsSubmitting(true);
      try {
        await updateShipmentPod(awbNumber, { receivedBy, signatureText, deliveryDate, remarks }, currentUser?.name);
        showToast(`POD generated for ${awbNumber.trim()}`);
        setSavedAwb(awbNumber.trim());
      } catch (err) {
        showToast(err?.message || 'Failed to update POD', 'error');
      } finally {
        setIsSubmitting(false);
      }
    },
    [awbNumber, deliveryDate, receivedBy, signatureText, remarks, currentUser, showToast]
  );

  if (savedAwb) {
    return (
      <div className="max-w-2xl mx-auto p-4 md:p-0">
        <SectionCard title="Proof of Delivery Generated">
          <p className="text-sm text-slate-600 mb-4">
            POD recorded for <span className="font-bold text-emerald-700">{savedAwb}</span>. The client can also view it from their Booking Summary.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to={`/operations/documents/pod/${encodeURIComponent(savedAwb)}`} className="bg-emerald-600 text-white text-sm font-bold px-4 py-2.5 rounded-lg hover:bg-emerald-700 transition">
              View / Print POD
            </Link>
            <button
              type="button"
              onClick={() => { setSavedAwb(null); setAwbNumber(''); setReceivedBy(''); setSignatureText(''); setDeliveryDate(''); setRemarks(''); }}
              className="text-sm font-bold text-slate-500 hover:text-slate-700 transition"
            >
              + Record Another POD
            </button>
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-6 p-4 md:p-0">
      <div>
        <h1 className="text-xl font-black text-slate-800">POD (Proof of Delivery) Update</h1>
        <p className="text-sm text-slate-500">Confirm final delivery — generates a printable POD document.</p>
      </div>

      <SectionCard title="Delivery Confirmation">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">AWB / CN Number</label>
            <input disabled={isSubmitting} placeholder="MLE-260763" value={awbNumber} onChange={(e) => setAwbNumber(e.target.value)} maxLength={30} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-50 focus:border-emerald-500 outline-none disabled:opacity-60" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Delivery Date</label>
            <input type="date" disabled={isSubmitting} value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-50 focus:border-emerald-500 outline-none disabled:opacity-60" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Received By (Consignee)</label>
            <input disabled={isSubmitting} placeholder="Md. Rashid Abid Sadman" value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)} maxLength={100} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-50 focus:border-emerald-500 outline-none disabled:opacity-60" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Signature (type full name)</label>
            <input disabled={isSubmitting} placeholder="Md. Rashid Abid Sadman" value={signatureText} onChange={(e) => setSignatureText(e.target.value)} maxLength={100} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-50 focus:border-emerald-500 outline-none disabled:opacity-60" style={{ fontFamily: 'cursive' }} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">Remarks</label>
            <textarea rows={3} disabled={isSubmitting} value={remarks} onChange={(e) => setRemarks(e.target.value)} maxLength={500} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-50 focus:border-emerald-500 outline-none disabled:opacity-60" />
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button type="submit" disabled={isSubmitting} className="bg-emerald-600 text-white font-bold px-6 py-3 rounded-lg shadow-md hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
            {isSubmitting ? 'Saving...' : 'Generate POD'}
          </button>
        </div>
      </SectionCard>
    </form>
  );
};

export default PodUpdate;