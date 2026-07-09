// src/Pages/modules/sales/pages/CustomersList.jsx
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSales } from '../hooks/useSales';
import { STATUS } from '../constants/salesStatus';
import StatusBadge from '../components/StatusBadge';
import Loader from '../../../../Components/Shared/Loader';

const CustomersList = () => {
  const { customers, isLoading, loadError, setSelectedCustomer } = useSales();
  const navigate = useNavigate();

  const activeCustomers = useMemo(
    () => customers.filter((c) => c.status === STATUS.ACTIVE),
    [customers]
  );

  const openCustomer = (c) => {
    setSelectedCustomer(c);
    navigate(`/app/customers/${encodeURIComponent(c.barcode)}`);
  };

  if (isLoading) return <Loader fullScreen label="Loading customers..." />;
  if (loadError) return <p className="text-sm text-red-600 font-semibold">{loadError}</p>;

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-300">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Fully Onboarded Customers</h2>
      <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[640px]">
          <thead>
            <tr className="border-b border-slate-200 text-xs text-slate-500 font-semibold bg-slate-50">
              <th className="p-4 pl-6">CUSTOMER CODE</th>
              <th className="p-4">ACCOUNT NAME</th>
              <th className="p-4">STATUS</th>
              <th className="p-4">PROFILE TYPE</th>
              <th className="p-4 pr-6 text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {activeCustomers.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400">
                  No onboarded customers yet.
                </td>
              </tr>
            ) : (
              activeCustomers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition">
                  <td className="p-4 pl-6 font-mono text-slate-600">{c.barcode}</td>
                  <td className="p-4 font-bold text-slate-800">{c.accountName}</td>
                  <td className="p-4">
                    <StatusBadge status={c.status} size="sm" />
                  </td>
                  <td className="p-4 text-xs font-bold text-slate-500">
                    <span
                      className={`px-2 py-0.5 rounded ${
                        c.accountProfileType === 'PROVISIONAL'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {c.accountProfileType || 'REGULAR'}
                    </span>
                  </td>
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