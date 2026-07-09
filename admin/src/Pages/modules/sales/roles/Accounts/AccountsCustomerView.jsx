// src/Pages/modules/sales/roles/Accounts/AccountsCustomerView.jsx
import React from 'react';

const AccountsCustomerView = ({ customer }) => (
  <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
    <h3 className="font-bold text-base text-slate-800 mb-6">Accounts View (Read-Only)</h3>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8 text-sm">
      <div>
        <span className="block text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-1.5">Account Type</span>
        <span className="font-medium text-slate-700">{customer.accountType}</span>
      </div>
      <div>
        <span className="block text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-1.5">Credit Limit / Period</span>
        <span className="font-medium text-slate-700">
          TK {customer.creditLimitTk} ({customer.creditPeriodDays} Days)
        </span>
      </div>
      <div>
        <span className="block text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-1.5">Profile Type</span>
        <span className="font-medium text-slate-700">{customer.accountProfileType || 'REGULAR'}</span>
      </div>
    </div>
  </div>
);

export default AccountsCustomerView;