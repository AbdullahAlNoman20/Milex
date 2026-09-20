// admin/src/Pages/modules/sales/components/FinalAccountProfileView.jsx

import { ClipboardCheck } from 'lucide-react';
import { GAIN_TYPE_OPTIONS, FINANCE_MODE_OPTIONS } from '../constants/formOptions';

const findLabel = (options, value) => options.find((o) => o.value === value)?.label || value || '—';

const FinalAccountProfileView = ({ customer }) => {
  if (!customer?.finalProfileCompleted) return null;

  const isCashAccount = customer.accountType === 'CASH';
  const creditValue = (value, suffix = '') => {
    if (isCashAccount) return 'Cash — no credit';
    return value ? `${value}${suffix}` : '—';
  };

  const rows = [
    [
      'Managing Partner',
      [customer.managingPartnerName, customer.managingPartnerDesignation]
        .filter(Boolean)
        .join(' — '),
      'BIN Number',
      customer.binNumber,
    ],
    ['TIN Number', customer.tinNumber, 'Destinations', customer.destinations],
    ['Preferred Carrier', customer.preferredCarrier, 'Nature of Business', customer.natureOfBusiness],
    ['Area', customer.area, 'Zone', customer.zone],
    ['Type', findLabel(GAIN_TYPE_OPTIONS, customer.gainType), 'Mode', findLabel(FINANCE_MODE_OPTIONS, customer.financeMode)],
    [
      'Final Amount Limit (BDT)',
      creditValue(customer.creditLimitTk),
      'Final Time Limit (Days)',
      creditValue(customer.creditPeriodDays, ' Days'),
    ],
  ];

  return (
    <div>
      <div className="px-1 pb-2.5">
        <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
          <ClipboardCheck size={16} className="text-purple-600" /> Final Account Profile Data
        </h3>
      </div>

      <table className="w-full text-sm border-collapse table-fixed bg-white rounded-xl border border-slate-200 overflow-hidden">
        <colgroup>
          <col className="w-[30%] sm:w-[22%]" />
          <col className="w-[70%] sm:w-[28%]" />
          <col className="hidden sm:table-column sm:w-[22%]" />
          <col className="hidden sm:table-column sm:w-[28%]" />
        </colgroup>
        <tbody>
          {rows.map(([l1, v1, l2, v2], i) => (
            <tr key={i} className={`border-b border-slate-100 last:border-b-0 ${i % 2 ? 'bg-slate-50/60' : ''}`}>
              <td className="px-4 sm:px-5 py-3 align-top text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                {l1}
              </td>
              <td className="px-4 sm:px-5 py-3 align-top font-medium text-slate-800 break-words">
                {v1 || '—'}
              </td>
              <td className="hidden sm:table-cell px-5 py-3 align-top text-[11px] font-bold text-slate-400 uppercase tracking-wide border-l border-slate-100">
                {l2}
              </td>
              <td className="hidden sm:table-cell px-5 py-3 align-top font-medium text-slate-800 break-words">
                {v2 || '—'}
              </td>
            </tr>
          ))}
          {/* mobile: right-hand pair stacked */}
          {rows.map(([, , l2, v2], i) => (
            <tr key={`m-${i}`} className={`sm:hidden border-b border-slate-100 last:border-b-0 ${i % 2 ? 'bg-slate-50/60' : ''}`}>
              <td className="px-4 py-3 align-top text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                {l2}
              </td>
              <td className="px-4 py-3 align-top font-medium text-slate-800 break-words">
                {v2 || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {customer.specialInstructions && (
        <div className="mt-3">
          <table className="w-full text-sm border-collapse bg-white rounded-xl border border-slate-200 overflow-hidden">
            <tbody>
              <tr>
                <td className="px-4 sm:px-5 py-3 align-top text-[11px] font-bold text-slate-400 uppercase tracking-wide w-[30%] sm:w-[22%]">
                  Special Instructions
                </td>
                <td className="px-4 sm:px-5 py-3 align-top font-medium text-slate-800 break-words">
                  {customer.specialInstructions}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default FinalAccountProfileView;