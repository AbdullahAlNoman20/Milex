// src/Pages/modules/sales/roles/LineManager/CustomerInfoApprovalPanel.jsx
import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { useSales } from '../../hooks/useSales';
import { STATUS } from '../../constants/salesStatus';

const CustomerInfoApprovalPanel = ({ customer }) => {
  const { updateStatus } = useSales();
  const request = customer.pendingInfoUpdate;

  const handleApprove = () => {
    if (!request) return;
    updateStatus(
      customer.id,
      STATUS.ACTIVE,
      { [request.field]: request.newValue, pendingInfoUpdate: null },
      'INFO UPDATE APPROVED BY LM',
      `${request.field} updated`
    );
  };

  const handleReject = () => {
    updateStatus(customer.id, STATUS.ACTIVE, { pendingInfoUpdate: null }, 'INFO UPDATE REJECTED BY LM');
  };

  if (!request) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <p className="text-xs text-slate-400 text-center">No pending info update request.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-blue-300 p-6 space-y-4">
      <h3 className="font-bold text-slate-900 text-base">Customer Info Update Request</h3>
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-xs space-y-1">
        <p>
          <span className="font-bold">Field:</span> {request.field}
        </p>
        <p>
          <span className="font-bold">New Value:</span> {request.newValue}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={handleApprove}
          className="bg-emerald-500 text-white font-bold py-3 rounded-xl flex justify-center items-center text-sm shadow hover:bg-emerald-600 transition"
        >
          <CheckCircle size={16} className="mr-1.5" /> Approve
        </button>
        <button
          type="button"
          onClick={handleReject}
          className="bg-white border border-red-400 text-red-500 font-bold py-3 rounded-xl flex justify-center items-center text-sm hover:bg-red-50 transition"
        >
          <XCircle size={16} className="mr-1.5" /> Reject
        </button>
      </div>
    </div>
  );
};

export default CustomerInfoApprovalPanel;