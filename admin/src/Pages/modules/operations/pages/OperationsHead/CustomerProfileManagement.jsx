// src/Pages/modules/operations/pages/OperationsHead/CustomerProfileManagement.jsx
import { useEffect, useState, useCallback } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import SectionCard from '../../components/SectionCard';
import { fetchClients } from '../../services/clientService';
import Loader from '../../../../../Components/Shared/Loader';
import { humanizeStatus } from '../../../../../Components/utils/format';

const CustomerProfileManagement = () => {
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setClients(await fetchClients());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (isLoading) return <Loader label="Loading customers..." />;

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4 md:p-0">
      <div>
        <h1 className="text-xl font-black text-slate-800">Customer Profile</h1>
        <p className="text-sm text-slate-500">Manage customer accounts.</p>
      </div>
      <SectionCard title="All Customers">
        <div className="space-y-2">
          {clients.map((c) => (
            <div key={c.id} className="border border-slate-100 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                className="w-full flex items-center justify-between gap-2 p-3 text-left hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {expandedId === c.id ? <ChevronUp size={16} className="text-slate-400 shrink-0" /> : <ChevronDown size={16} className="text-slate-400 shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-700 truncate">{c.accountName}</p>
                    <p className="text-xs text-slate-400 truncate">{c.businessType} · {c.creditPeriodDays} Days credit</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 shrink-0">
                  {humanizeStatus(c.status)}
                </span>
              </button>
              {expandedId === c.id && (
                <div className="bg-slate-50 border-t border-slate-100 p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="font-bold text-slate-500 uppercase text-[10px] mb-1">Contact</p>
                    <p>{c.contactPerson}</p>
                    <p>{c.mobile}</p>
                    <p>{c.email}</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-500 uppercase text-[10px] mb-1">Business</p>
                    <p>Type: {c.businessType}</p>
                    <p>Account Type: {c.accountType}</p>
                    <p>Credit Period: {c.creditPeriodDays} Days{c.creditLimitAmount ? ` · Limit $${c.creditLimitAmount}` : ''}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="font-bold text-slate-500 uppercase text-[10px] mb-1">Address</p>
                    <p>{c.address}</p>
                    <p>{c.area}, {c.zone}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
};

export default CustomerProfileManagement;