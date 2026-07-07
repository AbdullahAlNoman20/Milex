// src/Components/Shared/Loader.jsx
import React from 'react';

const SIZES = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-2',
  lg: 'w-12 h-12 border-4',
};

const Loader = ({ size = 'md', label = 'Loading...', fullScreen = false, className = '' }) => {
  const spinner = (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-3 ${className}`}
    >
      <div
        className={`${SIZES[size] || SIZES.md} rounded-full border-slate-200 border-t-emerald-600 animate-spin`}
      />
      {label && <span className="text-xs font-semibold text-slate-500">{label}</span>}
    </div>
  );

  if (!fullScreen) return spinner;

  return (
    <div className="fixed inset-0 z-50 bg-white/70 backdrop-blur-sm flex items-center justify-center">
      {spinner}
    </div>
  );
};

export default Loader;