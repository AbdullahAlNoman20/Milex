// src/Pages/modules/sales/roles/Operations/OperationsCustomerView.jsx
import React from 'react';

const OperationsCustomerView = ({ customer }) => (
  <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
    <h3 className="font-bold text-base text-slate-800 mb-6">Operations View (Read-Only)</h3>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8 text-sm">
      <div>
        <span className="block text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-1.5">Business Type</span>
        <span className="font-medium text-slate-700">{customer.businessType}</span>
      </div>
      <div>
        <span className="block text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-1.5">Service Required</span>
        <span className="font-medium text-slate-700">{customer.serviceRequired}</span>
      </div>
      <div className="sm:col-span-2">
        <span className="block text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-1.5">Shipping Routes</span>
        <div className="space-y-2">
          {(customer.shippingDetails || []).map((s, i) => (
            <div key={i} className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-3">
              {s.country} — {s.rateFor} — {(s.shipmentType || []).join(', ')}
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default OperationsCustomerView;