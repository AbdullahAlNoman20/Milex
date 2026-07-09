// src/Pages/modules/sales/pages/TaskQueue.jsx
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSales } from '../hooks/useSales';
import { STATUS } from '../constants/salesStatus';
import StatusBadge from '../components/StatusBadge';
import Loader from '../../../../Components/Shared/Loader';

const TaskQueue = () => {
  const { customers, isLoading, loadError, setSelectedCustomer } = useSales();
  const navigate = useNavigate();

  const pendingCustomers = useMemo(
    () => customers.filter((c) => c.status !== STATUS.ACTIVE),
    [customers]
  );

  const openCustomer = (c) => {
    setSelectedCustomer(c);
    navigate(`/app/customers/${encodeURIComponent(c.barcode)}`);
  };

  if (isLoading) return <Loader fullScreen label="Loading tasks..." />;
  if (loadError) return <p className="text-sm text-red-600 font-semibold">{loadError}</p>;

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-300">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Task Queue & In-Progress Workflows</h2>
      <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[640px]">
          <thead>
            <tr className="border-b border-slate-200 text-xs text-slate-500 font-semibold bg-slate-50">
              <th className="p-4 pl-6">CUSTOMER CODE</th>
              <th className="p-4">ACCOUNT NAME</th>
              <th className="p-4">WORKFLOW STATUS</th>
              <th className="p-4">ASSIGNED KAM</th>
              <th className="p-4 pr-6 text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {pendingCustomers.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400">
                  No active tasks.
                </td>
              </tr>
            ) : (
              pendingCustomers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition">
                  <td className="p-4 pl-6 font-mono text-slate-600">{c.barcode}</td>
                  <td className="p-4 font-bold text-slate-800">{c.accountName}</td>
                  <td className="p-4">
                    <StatusBadge status={c.status} size="sm" />
                  </td>
                  <td className="p-4 text-xs font-medium text-slate-500">{c.handledBy}</td>
                  <td className="p-4 pr-6 text-right">
                    <button
                      type="button"
                      onClick={() => openCustomer(c)}
                      className="text-emerald-600 hover:text-emerald-800 font-semibold text-xs border border-emerald-200 px-3 py-1.5 rounded hover:bg-emerald-50 transition"
                    >
                      Open Record
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

export default TaskQueue;