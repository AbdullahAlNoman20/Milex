// src/Pages/modules/sales/roles/Admin/AdminOverview.jsx
import React, { useMemo } from 'react';
import { useSales } from '../../hooks/useSales';
import { STATUS } from '../../constants/salesStatus';

const AdminOverview = () => {
  const { customers } = useSales();

  const stats = useMemo(
    () => ({
      total: customers.length,
      active: customers.filter((c) => c.status === STATUS.ACTIVE).length,
      provisional: customers.filter((c) => c.accountProfileType === 'PROVISIONAL').length,
      pendingInfoUpdates: customers.filter((c) => c.status === STATUS.INFO_UPDATE_PENDING).length,
    }),
    [customers]
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Admin Console</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Object.entries(stats).map(([key, value]) => (
          <div key={key} className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
            <p className="text-xs text-slate-500 font-medium mb-1 capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminOverview;