// admin/src/Pages/modules/sales/components/AuditTrail.jsx — REPLACE ENTIRE FILE
import React from 'react';
import { Clock } from 'lucide-react';

const TimelineNode = ({ title, subText, timestamp, isActive, isPending }) => (
  <div className="relative flex items-start">
    <div
      className={`flex items-center justify-center w-6 h-6 rounded-full border-4 border-white shrink-0 z-10 ${
        isActive ? 'bg-emerald-500 shadow-[0_0_0_2px_rgba(16,185,129,0.3)]' : isPending ? 'bg-amber-400' : 'bg-slate-300'
      }`}
    />
    <div className="ml-4 -mt-1 w-full">
      <p
        className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${
          isActive ? 'text-emerald-700' : isPending ? 'text-amber-600' : 'text-slate-500'
        }`}
      >
        {title}
      </p>
      {subText && <p className="text-[11px] text-slate-600 mb-1">{subText}</p>}
      <p className="text-[10px] text-slate-400 font-mono">{timestamp || (isPending ? 'In progress' : '')}</p>
    </div>
  </div>
);

const AuditTrail = ({ history = [], activeStepLabel = '' }) => {
  const safeHistory = Array.isArray(history) ? history : [];
  const hasActiveStep = safeHistory.some((h) => h.status === 'active');

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-5 flex items-center border-b border-slate-100">
        <Clock size={18} className="text-slate-400 mr-2" />
        <h3 className="font-bold text-base text-slate-800">Process Audit Trail</h3>
      </div>
      <div className="p-6 pb-8">
        {safeHistory.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">No history recorded yet.</p>
        ) : (
          <div className="space-y-8 relative before:absolute before:inset-0 before:ml-[11px] before:h-full before:w-[2px] before:bg-slate-200">
            {safeHistory.map((h, i) => (
              <TimelineNode
                key={h.id || `${h.action}-${i}`}
                title={h.action}
                subText={h.subText}
                timestamp={h.createdAt ? new Date(h.createdAt).toLocaleString() : ''}
                isActive={h.status === 'active'}
              />
            ))}
            {hasActiveStep && activeStepLabel && (
              <TimelineNode title={activeStepLabel} isPending />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditTrail;