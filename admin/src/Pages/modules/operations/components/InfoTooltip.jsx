// src/Pages/modules/operations/components/InfoTooltip.jsx
import { useState } from 'react';
import { Info } from 'lucide-react';

const InfoTooltip = ({ text, example }) => {
  const [open, setOpen] = useState(false);
  if (!text) return null;

  return (
    <span className="relative inline-flex ml-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        aria-label="Field help"
        className="text-slate-400 hover:text-emerald-600 transition"
      >
        <Info size={13} />
      </button>
      {open && (
        <div className="absolute z-30 left-0 top-5 w-56 bg-slate-800 text-white text-[11px] leading-snug rounded-lg p-2.5 shadow-xl">
          <p>{text}</p>
          {example && <p className="mt-1 text-emerald-300">e.g. {example}</p>}
        </div>
      )}
    </span>
  );
};

export default InfoTooltip;