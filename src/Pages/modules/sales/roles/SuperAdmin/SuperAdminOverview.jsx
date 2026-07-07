// src/Pages/modules/sales/roles/SuperAdmin/SuperAdminOverview.jsx
import React from 'react';
import AdminOverview from '../Admin/AdminOverview';

const SuperAdminOverview = () => (
  <div className="max-w-4xl mx-auto space-y-6">
    <h2 className="text-2xl font-bold text-slate-800">Super Admin Console</h2>
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <p className="text-sm text-slate-500">Full system control panel — user & role management placeholder.</p>
    </div>
    <AdminOverview />
  </div>
);

export default SuperAdminOverview;