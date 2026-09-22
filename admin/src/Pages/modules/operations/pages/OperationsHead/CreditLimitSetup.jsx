// src/Pages/modules/operations/pages/OperationsHead/CreditLimitSetup.jsx
import { useState, useEffect, useCallback } from 'react';
import SectionCard from '../../components/SectionCard';
import Loader from '../../../../../Components/Shared/Loader';
import { fetchClients, updateClient } from '../../services/clientService';
import { useToast } from '../../../../../Components/hooks/useToast';
import { isRequired, isPositiveNumber, isValidCreditPeriod } from '../../../../../Components/utils/validators';

// Note: creditLimitAmount is not yet persisted on the client record —
// backend field to be added once real credit-approval hierarchy is confirmed.
const CreditLimitSetup = () => {
  const { showToast } = useToast();
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [creditPeriodDays, setCreditPeriodDays] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const records = await fetchClients();
      setClients(records);
      if (records.length > 0) {
        setSelectedId(String(records[0].id));
        setCreditPeriodDays(String(records[0].creditPeriodDays || ''));
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSelect = (id) => {
    setSelectedId(id);
    const client = clients.find((c) => String(c.id) === id);
    setCreditPeriodDays(String(client?.creditPeriodDays || ''));
    setCreditLimit('');
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isRequired(selectedId)) return showToast('Select a customer', 'warning');
    if (!isPositiveNumber(creditLimit)) return showToast('Credit Limit must be a valid number', 'warning');
    if (!isValidCreditPeriod(creditPeriodDays)) return showToast('Credit Period must be between 1 and 90 days', 'warning');

    setIsSaving(true);
    try {
      await updateClient(selectedId, {
        creditLimitAmount: Number(creditLimit),
        creditPeriodDays: Number(creditPeriodDays),
      });
      showToast('Credit limit updated successfully');
      await load();
    } catch (err) {
      showToast(err?.message || 'Failed to update credit limit', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <Loader label="Loading customers..." />;

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4 md:p-0">
      <div>
        <h1 className="text-xl font-black text-slate-800">Credit Limit Setup</h1>
        <p className="text-sm text-slate-500">Set credit limits and payment periods per customer.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <SectionCard title="Set / Update Credit Limit">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Customer</label>
              <select value={selectedId} onChange={(e) => handleSelect(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-50 focus:border-emerald-500 outline-none">
                {clients.map((c) => <option key={c.id} value={c.id}>{c.accountName}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Credit Limit (USD)</label>
              <input type="number" min="0" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-50 focus:border-emerald-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Credit Period (Days, max 90)</label>
              <input type="number" min="1" max="90" value={creditPeriodDays} onChange={(e) => setCreditPeriodDays(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-50 focus:border-emerald-500 outline-none" />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button type="submit" disabled={isSaving} className="bg-emerald-600 text-white font-bold px-6 py-3 rounded-lg shadow-md hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </SectionCard>
      </form>

      <SectionCard title="All Customer Credit Terms">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100">
                <th className="py-2 pr-4">Account Name</th>
                <th className="py-2 pr-4">Account Type</th>
                <th className="py-2 pr-4">Credit Period</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="border-b border-slate-50 last:border-b-0">
                  <td className="py-3 pr-4 font-bold text-slate-700">{c.accountName}</td>
                  <td className="py-3 pr-4 text-slate-600">{c.accountType}</td>
                  <td className="py-3 pr-4 text-slate-600">{c.creditPeriodDays} Days{c.creditLimitAmount ? ` · $${c.creditLimitAmount}` : ''}</td>
                  <td className="py-3">
                    <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">Active</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
};

export default CreditLimitSetup;