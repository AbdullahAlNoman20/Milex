// src/Components/Shared/BarcodeBadge.jsx
import { useMemo } from 'react';
import { FileDigit } from 'lucide-react';

// Allows the optional IB direction marker that inbound references carry.
const BARCODE_PATTERN = /^(REF-)?[A-Z0-9]{5,24}(-R[0-9]+)?$/;

const BarcodeBadge = ({ value, variant = 'default', className = '', showBars = true }) => {
  const isValid = useMemo(() => typeof value === 'string' && BARCODE_PATTERN.test(value), [value]);
  const bars = useMemo(() => {
    if (!isValid || !showBars) return [];
    let seed = 0;
    const base = value.replace(/^REF-/, '').split('-R')[0];
    for (let i = 0; i < base.length; i++) seed = (seed * 31 + base.charCodeAt(i)) >>> 0;
    return Array.from({ length: 32 }, () => {
      seed = (seed * 1103515245 + 12345) >>> 0;
      return (seed % 100) > 50 ? 2 : 4;
    });
  }, [value, isValid, showBars]);

  const variants = {
    default: 'text-slate-500 bg-slate-50 border-slate-200',
    blue: 'text-blue-600 bg-blue-50 border-blue-100',
  };

  if (!isValid) return null;

  return (
    <span
      title={value}
      className={`font-mono text-[11px] font-bold inline-flex items-center max-w-full overflow-hidden px-3 py-1.5 rounded-md border ${variants[variant] || variants.default} ${className}`}
    >
      <FileDigit size={14} className="mr-2 shrink-0" />
      <span className="truncate min-w-0">{value}</span>
      {showBars && bars.length > 0 && (
        <span className="ml-2 hidden sm:flex items-stretch h-4 gap-[1px] opacity-70" aria-hidden="true">
          {bars.map((w, i) => (
            <span key={i} className="bg-current h-full" style={{ width: `${w}px` }} />
          ))}
        </span>
      )}
    </span>
  );
};

export default BarcodeBadge;