// admin/src/Pages/modules/sales/components/FinalAccountProfileView.jsx 
import React from 'react';
import { ClipboardCheck } from 'lucide-react';
import { GAIN_TYPE_OPTIONS, FINANCE_MODE_OPTIONS } from '../constants/formOptions';

const findLabel = (options, value) => options.find((o) => o.value === value)?.label || value || '—';

const Field = ({ label, value }) => (
  <div>
    <span className="block text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-1">{label}</span>
    <span className="font-medium text-slate-700 text-sm">{value || '—'}</span>
  </div>
);

const FinalAccountProfileView = ({ customer }) => {
  if (!customer?.finalProfileCompleted) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
      <h3 className="font-bold text-slate-900 text-base flex items-center">
        <ClipboardCheck size={18} className="mr-2 text-purple-600" /> Final Account Profile Data
      </h3>
      {customer.provisionalReason && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <span className="block text-amber-600 text-[10px] uppercase font-bold tracking-widest mb-1">Reason for Provisional</span>
          <p className="text-sm text-amber-800">{customer.provisionalReason}</p>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Managing Partner" value={customer.managingPartnerName} />
        <Field label="BIN Number" value={customer.binNumber} />
        <Field label="TIN Number" value={customer.tinNumber} />
        <Field label="Destinations" value={customer.destinations} />
        <Field label="Preferred Carrier" value={customer.preferredCarrier} />
        <Field label="Nature of Business" value={customer.natureOfBusiness} />
        <Field label="Area" value={customer.area} />
        <Field label="Zone" value={customer.zone} />
        <Field label="Type" value={findLabel(GAIN_TYPE_OPTIONS, customer.gainType)} />
        <Field label="Mode" value={findLabel(FINANCE_MODE_OPTIONS, customer.financeMode)} />
        <Field label="Final Amount Limit (BDT)" value={customer.creditLimitTk} />
        <Field label="Final Time Limit (Days)" value={customer.creditPeriodDays} />
      </div>
      {customer.specialInstructions && <Field label="Special Instructions" value={customer.specialInstructions} />}
    </div>
  );
};

export default FinalAccountProfileView;