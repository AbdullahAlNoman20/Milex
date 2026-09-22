// src/Pages/modules/operations/pages/OperationsHead/DelayClaimManagement.jsx
import { useState, useEffect, useCallback } from 'react';
import SectionCard from '../../components/SectionCard';
import Loader from '../../../../../Components/Shared/Loader';
import { useToast } from '../../../../../Components/hooks/useToast';
import { useOperationsAuth } from '../../hooks/useOperationsAuth';
import { fetchClaims, createClaim, updateClaimStatus, CLAIM_TYPES, CLAIM_STATUS } from '../../services/claimService';
import { isRequired } from '../../../../../Components/utils/validators';

const STATUS_TONE = { UNDER_REVIEW: 'bg-amber-50 text-amber-700', RESOLVED: 'bg-emerald-50 text-emerald-700', REJECTED: 'bg-red-50 text-red-600' };

const DelayClaimManagement = () => {
  const { currentUser } = useOperationsAuth();
  const { showToast } = useToast();
  const [claims, setClaims] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [awbNumber, setAwbNumber] = useState('');
  const [claimType, setClaimType] = useState('');
  const [claimAmount, setClaimAmount] = useState('');
  const [description, setDescription] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setClaims(await fetchClaims());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!isRequired(awbNumber)) return showToast('AWB / CN Number is required', 'warning');
      if (!isRequired(claimType)) return showToast('Claim type is required', 'warning');
      if (!isRequired(description)) return showToast('Description is required', 'warning');

      setIsSubmitting(true);
      try {
        await createClaim({ awbNumber, claimType, claimAmount, description }, currentUser?.name);
        showToast('Claim raised successfully');
        setAwbNumber('');
        setClaimType('');
        setClaimAmount('');
        setDescription('');
        await load();
      } catch (err) {
        showToast(err?.message || 'Failed to raise claim', 'error');
      } finally {
        setIsSubmitting(false);
      }
    },
    [awbNumber, claimType, claimAmount, description, currentUser, showToast, load]
  );

  const handleResolve = useCallback(
    async (id, status) => {
      setBusyId(id);
      try {
        await updateClaimStatus(id, status);
        showToast(status === CLAIM_STATUS.RESOLVED ? 'Claim resolved' : 'Claim rejected');
        await load();
      } catch (err) {
        showToast(err?.message || 'Failed to update claim', 'error');
      } finally {
        setBusyId(null);
      }
    },
    [showToast, load]
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4 md:p-0">
      <div>
        <h1 className="text-xl font-black text-slate-800">Delay / Claim Management</h1>
        <p className="text-sm text-slate-500">Log and resolve shipment delay, damage, or loss claims.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <SectionCard title="Raise a New Claim">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">AWB / CN Number</label>
              <input disabled={isSubmitting} value={awbNumber} onChange={(e) => setAwbNumber(e.target.value)} maxLength={30} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-50 focus:border-emerald-500 outline-none disabled:opacity-60" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Claim Type</label>
              <select disabled={isSubmitting} value={claimType} onChange={(e) => setClaimType(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-50 focus:border-emerald-500 outline-none disabled:opacity-60">
                <option value="">Select...</option>
                {CLAIM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Claim Amount (USD)</label>
              <input type="number" min="0" disabled={isSubmitting} value={claimAmount} onChange={(e) => setClaimAmount(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-50 focus:border-emerald-500 outline-none disabled:opacity-60" />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
              <textarea rows={3} disabled={isSubmitting} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-50 focus:border-emerald-500 outline-none disabled:opacity-60" />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button type="submit" disabled={isSubmitting} className="bg-emerald-600 text-white font-bold px-6 py-3 rounded-lg shadow-md hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
              {isSubmitting ? 'Raising...' : 'Raise Claim'}
            </button>
          </div>
        </SectionCard>
      </form>

      <SectionCard title="Existing Claims">
        {isLoading ? (
          <Loader label="Loading claims..." />
        ) : claims.length === 0 ? (
          <p className="text-sm text-slate-400">No claims raised yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100">
                  <th className="py-2 pr-4">AWB / CN</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {claims.map((c) => (
                  <tr key={c.id} className="border-b border-slate-50 last:border-b-0">
                    <td className="py-3 pr-4 font-bold text-slate-700">{c.awbNumber}</td>
                    <td className="py-3 pr-4 text-slate-600">{c.claimType}</td>
                    <td className="py-3 pr-4 text-slate-600">{c.claimAmount ? `$${c.claimAmount}` : '—'}</td>
                    <td className="py-3 pr-4">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${STATUS_TONE[c.status]}`}>{c.status.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="py-3 space-x-2">
                      {c.status === CLAIM_STATUS.UNDER_REVIEW && (
                        <>
                          <button type="button" disabled={busyId === c.id} onClick={() => handleResolve(c.id, CLAIM_STATUS.RESOLVED)} className="text-xs font-bold text-emerald-600 hover:underline disabled:opacity-40">
                            Resolve
                          </button>
                          <button type="button" disabled={busyId === c.id} onClick={() => handleResolve(c.id, CLAIM_STATUS.REJECTED)} className="text-xs font-bold text-red-600 hover:underline disabled:opacity-40">
                            Reject
                          </button>
                        </>
                      )}
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

export default DelayClaimManagement;