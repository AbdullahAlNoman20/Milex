// admin/src/Pages/modules/sales/pages/CustomersList.jsx 
import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSales } from '../hooks/useSales';
import { STATUS } from '../constants/salesStatus';
import StatusBadge from '../components/StatusBadge';
import Countdown from '../../../../Components/Shared/Countdown';
import Loader from '../../../../Components/Shared/Loader';
import { formatRevision } from '../../../../Components/utils/format';

const TABS = [
  { key: 'customer', label: 'Active Customer' },
  { key: 'provisional', label: 'Provisional Customer' },
  { key: 'pending', label: 'Pending' },
];

const CustomersList = () => {
  const { customers, isLoading, loadError, setSelectedCustomer } = useSales();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(TABS.some((t) => t.key === tabParam) ? tabParam : 'customer');
  const navigate = useNavigate();

  useEffect(() => {
    if (tabParam && TABS.some((t) => t.key === tabParam)) setActiveTab(tabParam);
  }, [tabParam]);

  const grouped = useMemo(
    () => ({
      pending: customers.filter((c) => [STATUS.PENDING_RATE, STATUS.PENDING_APPROVAL].includes(c.status)),
      provisional: customers.filter((c) => c.accountProfileType === 'PROVISIONAL' && c.status !== STATUS.ACTIVE),
      customer: customers.filter((c) => c.status === STATUS.ACTIVE),
    }),
    [customers]
  );

  const rows = grouped[activeTab] || [];
  const columnCount = activeTab === 'provisional' ? 6 : 5;

  const openCustomer = (c) => {
    setSelectedCustomer(c);
    navigate(`/app/customers/${encodeURIComponent(c.barcode)}`);
  };

  if (isLoading) return <Loader fullScreen label="Loading customers..." />;
  if (loadError) return <p className="text-sm text-red-600 font-semibold">{loadError}</p>;

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-300">
      <h2 className="text-2xl font-bold text-slate-800 mb-4">Customers</h2>

      <div className="flex gap-2 mb-6 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveTab(t.key)}
            className={`px-5 py-2.5 text-sm font-bold border-b-2 transition ${
              activeTab === t.key ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {t.label} <span className="ml-1 text-xs font-normal">({grouped[t.key].length})</span>
          </button>
        ))}
      </div>

      <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[820px]">
          <thead>
            <tr className="border-b border-slate-200 text-xs text-slate-500 font-semibold bg-slate-50">
              <th className="p-4 pl-6">CUSTOMER CODE</th>
              <th className="p-4">ACCOUNT NAME</th>
              <th className="p-4">STATUS</th>
              <th className="p-4">REVISION</th>
              <th className="p-4">ASSIGNED KAM</th>
              {activeTab === 'provisional' && <th className="p-4">DOC WINDOW REMAINING</th>}
              <th className="p-4 pr-6 text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columnCount} className="p-8 text-center text-slate-400">No customers in this category.</td>
              </tr>
            ) : (
              rows.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition">
                  <td className="p-4 pl-6 font-mono text-slate-600">{c.barcode}</td>
                  <td className="p-4 font-bold text-slate-800">{c.accountName}</td>
                  <td className="p-4"><StatusBadge status={c.status} size="sm" /></td>
                  <td className="p-4 text-xs font-bold text-slate-500">{formatRevision(c.revision)}</td>
                  <td className="p-4 text-xs font-medium text-slate-500">{c.handledBy?.name || '—'}</td>
                  {activeTab === 'provisional' && (
                    <td className="p-4">
                      {c.status === STATUS.PROVISIONAL_ACTIVE ? <Countdown expiryDate={c.provisionalExpiryDate} /> : <span className="text-xs text-slate-400">—</span>}
                    </td>
                  )}
                  <td className="p-4 pr-6 text-right">
                    <button
                      type="button"
                      onClick={() => openCustomer(c)}
                      className="text-slate-600 hover:text-slate-800 font-semibold text-xs border border-slate-200 px-3 py-1.5 rounded hover:bg-slate-100 transition"
                    >
                      View Profile
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CustomersList;