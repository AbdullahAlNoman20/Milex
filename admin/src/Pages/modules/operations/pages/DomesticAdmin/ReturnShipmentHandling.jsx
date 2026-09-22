// src/Pages/modules/operations/pages/DomesticAdmin/ReturnShipmentHandling.jsx
// (Re-exported verbatim as ForeignAdmin & OperationsHead ReturnShipmentHandling.jsx)
import { useState, useEffect, useCallback } from 'react';
import SectionCard from '../../components/SectionCard';
import Loader from '../../../../../Components/Shared/Loader';
import { useToast } from '../../../../../Components/hooks/useToast';
import { useOperationsAuth } from '../../hooks/useOperationsAuth';
import { fetchReturns, createReturn, RETURN_REASONS } from '../../services/returnService';
import { isRequired } from '../../../../../Components/utils/validators';

const STATUS_TONE = { LOGGED: 'bg-amber-50 text-amber-700', IN_RETURN_TRANSIT: 'bg-blue-50 text-blue-700', COMPLETED: 'bg-emerald-50 text-emerald-700' };

const ReturnShipmentHandling = () => {
  const { currentUser } = useOperationsAuth();
  const { showToast } = useToast();
  const [awbNumber, setAwbNumber] = useState('');
  const [reason, setReason] = useState('');
  const [remarks, setRemarks] = useState('');
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setRows(await fetchReturns());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!isRequired(awbNumber)) return showToast('Original AWB / CN number is required', 'warning');
      if (!isRequired(reason)) return showToast('Return reason is required', 'warning');

      setIsSubmitting(true);
      try {
        await createReturn({ awbNumber, reason, remarks }, currentUser?.name);
        showToast('Return logged successfully');
        setAwbNumber('');
        setReason('');
        setRemarks('');
        await load();
      } catch (err) {
        showToast(err?.message || 'Failed to log return', 'error');
      } finally {
        setIsSubmitting(false);
      }
    },
    [awbNumber, reason, remarks, currentUser, showToast, load]
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4 md:p-0">
      <div>
        <h1 className="text-xl font-black text-slate-800">Return Shipment Handling</h1>
        <p className="text-sm text-slate-500">Log and track shipments returned by the consignee or rejected by customs.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <SectionCard title="Log a Return">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Original AWB / CN Number</label>
              <input disabled={isSubmitting} value={awbNumber} onChange={(e) => setAwbNumber(e.target.value)} maxLength={30} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-50 focus:border-emerald-500 outline-none disabled:opacity-60" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Return Reason</label>
              <select disabled={isSubmitting} value={reason} onChange={(e) => setReason(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-50 focus:border-emerald-500 outline-none disabled:opacity-60">
                <option value="">Select...</option>
                {RETURN_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Remarks</label>
              <textarea rows={3} disabled={isSubmitting} value={remarks} onChange={(e) => setRemarks(e.target.value)} maxLength={500} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-50 focus:border-emerald-500 outline-none disabled:opacity-60" />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button type="submit" disabled={isSubmitting} className="bg-emerald-600 text-white font-bold px-6 py-3 rounded-lg shadow-md hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
              {isSubmitting ? 'Logging...' : 'Log Return'}
            </button>
          </div>
        </SectionCard>
      </form>

      <SectionCard title="Return Log">
        {isLoading ? (
          <Loader label="Loading returns..." />
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-400">No returns logged yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100">
                  <th className="py-2 pr-4">Original AWB</th>
                  <th className="py-2 pr-4">Reason</th>
                  <th className="py-2 pr-4">Remarks</th>
                  <th className="py-2 pr-4">Logged By</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50 last:border-b-0">
                    <td className="py-3 pr-4 font-bold text-slate-700">{r.awbNumber}</td>
                    <td className="py-3 pr-4 text-slate-600">{r.reason}</td>
                    <td className="py-3 pr-4 text-slate-500 max-w-xs truncate">{r.remarks || '—'}</td>
                    <td className="py-3 pr-4 text-slate-500">{r.loggedBy}</td>
                    <td className="py-3">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${STATUS_TONE[r.status]}`}>{r.status.replace(/_/g, ' ')}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
};

export default ReturnShipmentHandling;