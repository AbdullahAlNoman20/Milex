// src/Pages/modules/operations/components/HorizontalStageTracker.jsx
// Line-drawing horizontal stepper (matches the ShipTrack reference): a
// connecting progress line runs through circular stage markers — filled +
// checkmark for completed stages, ringed pulse for the current stage,
// hollow for upcoming. Shows the high-level stage groups, not every
// granular status (that detail stays in StatusTimeline below it).
import { Check } from 'lucide-react';
import { getStageGroups, getStatusIndex } from '../constants/shipmentStatus';

const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

const HorizontalStageTracker = ({ sequence, currentIndex, mode, updatedAt }) => {
  const groups = getStageGroups(mode);
  const indexOf = (code) => sequence.findIndex((s) => s.code === code);

  const stages = groups
    .map((g) => {
      const lastCode = g.codes[g.codes.length - 1];
      const idx = indexOf(lastCode);
      return { title: g.title, idx };
    })
    .filter((s) => s.idx !== -1);

  const activeStageIdx = stages.findIndex((s) => currentIndex <= s.idx);
  const currentStagePos = activeStageIdx === -1 ? stages.length - 1 : activeStageIdx;
  const progressPct = stages.length > 1 ? (currentStagePos / (stages.length - 1)) * 100 : 0;

  return (
    <div className="overflow-x-auto pb-2">
      <div className="relative min-w-[500px] px-2 pt-2">
        {/* Base line */}
        <div className="absolute left-0 right-0 top-4 h-0.5 bg-slate-200" style={{ marginLeft: '2.5%', marginRight: '2.5%' }} />
        {/* Filled progress line */}
        <div
          className="absolute left-0 top-4 h-0.5 bg-blue-600 transition-all duration-500"
          style={{ marginLeft: '2.5%', width: `calc(${progressPct}% * 0.95)` }}
        />

        <div className="relative flex justify-between">
          {stages.map((stage, i) => {
            const isDone = i < currentStagePos;
            const isCurrent = i === currentStagePos;
            return (
              <div key={stage.title} className="flex flex-col items-center gap-2 flex-1 min-w-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 transition-all ${
                    isDone
                      ? 'bg-blue-600 text-white'
                      : isCurrent
                      ? 'bg-white text-blue-600 border-2 border-blue-600 ring-4 ring-blue-100'
                      : 'bg-white text-slate-300 border-2 border-slate-200'
                  }`}
                >
                  {isDone ? <Check size={14} /> : <span className={`w-2 h-2 rounded-full ${isCurrent ? 'bg-blue-600' : 'bg-slate-200'}`} />}
                </div>
                <div className="text-center px-1">
                  <p className={`text-[11px] font-bold whitespace-nowrap ${isDone || isCurrent ? 'text-slate-800' : 'text-slate-400'}`}>
                    {stage.title}
                  </p>
                  {isCurrent && updatedAt && (
                    <p className="text-[9px] text-slate-400 mt-0.5">{formatDate(updatedAt)}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default HorizontalStageTracker;