// src/Pages/modules/sales/components/StatusBadge.jsx

import { getStatusTone } from '../constants/salesStatus';
import { humanizeStatus } from '../../../../Components/utils/format';

const TONE_CLASSES = {
  danger: 'text-red-700 bg-red-50 border-red-200',
  success: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  pending: 'text-amber-700 bg-[#FFFDF5] border-amber-200',
};

const StatusBadge = ({ status, size = 'md' }) => {
  if (!status) return null;
  const tone = getStatusTone(status);
  const sizeClasses = size === 'sm' ? 'text-[9px] px-2.5 py-1' : 'text-sm px-5 py-3';

  return (
    <span
      className={`inline-block rounded-lg font-bold uppercase tracking-wider border-2 ${sizeClasses} ${
        TONE_CLASSES[tone] || TONE_CLASSES.pending
      }`}
    >
      {humanizeStatus(status)}
    </span>
  );
};

// A live customer being re-quoted keeps its own standing, so the status badge
// correctly reads "Active Account" — which on a task list gave no clue why the
// record was sitting in the queue at all. This says what is actually pending.
export const RateProcessBadge = ({ customer }) => {
  if (!customer?.rateProcessActive) return null;
  return (
    <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 rounded px-2 py-0.5">
      New rate in progress
    </span>
  );
};

export default StatusBadge;