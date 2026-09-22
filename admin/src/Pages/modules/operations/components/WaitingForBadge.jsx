// src/Pages/modules/operations/components/WaitingForBadge.jsx
import { AlertTriangle } from 'lucide-react';
import { getWaitingForInfo } from '../constants/shipmentStatus';

// Plain colored text, no pill/border — just needs to read differently by color.
const WaitingForBadge = ({ mode, statusCode, exceptionCode, className = '' }) => {
  const { text, isNegative, isComplete } = getWaitingForInfo(mode, statusCode, exceptionCode);
  const toneClass = isNegative ? 'text-red-600' : isComplete ? 'text-emerald-600' : 'text-blue-600';

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold whitespace-nowrap ${toneClass} ${className}`}>
      {isNegative && <AlertTriangle size={12} className="shrink-0" />}
      {text}
    </span>
  );
};

export default WaitingForBadge;