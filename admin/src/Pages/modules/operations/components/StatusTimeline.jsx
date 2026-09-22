// src/Pages/modules/operations/components/StatusTimeline.jsx
import { useState, useEffect } from 'react';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { getStageGroups } from '../constants/shipmentStatus';

// Groups a flat status sequence into collapsible stage sections instead of
// one long vertical list. The stage containing the current status auto-opens.
const StatusTimeline = ({ sequence, currentIndex = -1, mode = 'EXPORT' }) => {
  const groups = getStageGroups(mode);
  const indexOf = (code) => sequence.findIndex((s) => s.code === code);
  const activeGroupIdx = groups.findIndex((g) => g.codes.some((c) => indexOf(c) === currentIndex));

  const [openGroup, setOpenGroup] = useState(activeGroupIdx >= 0 ? activeGroupIdx : 0);

  useEffect(() => {
    if (activeGroupIdx >= 0) setOpenGroup(activeGroupIdx);
  }, [activeGroupIdx]);

  return (
    <div className="space-y-2">
      {groups.map((group, gIdx) => {
        const groupSteps = group.codes.map((c) => sequence[indexOf(c)]).filter(Boolean);
        if (groupSteps.length === 0) return null;
        const doneCount = groupSteps.filter((s) => indexOf(s.code) <= currentIndex).length;
        const isComplete = doneCount === groupSteps.length;
        const isOpen = openGroup === gIdx;

        return (
          <div key={group.title} className="border border-slate-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenGroup(isOpen ? -1 : gIdx)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-slate-50 hover:bg-slate-100 transition text-left"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${isComplete ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                  {isComplete ? <Check size={11} /> : gIdx + 1}
                </span>
                <span className="text-xs font-bold text-slate-700 truncate">{group.title}</span>
                <span className="text-[10px] text-slate-400 shrink-0">({doneCount}/{groupSteps.length})</span>
              </div>
              {isOpen ? <ChevronUp size={14} className="text-slate-400 shrink-0" /> : <ChevronDown size={14} className="text-slate-400 shrink-0" />}
            </button>
            {isOpen && (
              <div className="p-3 space-y-3">
                {groupSteps.map((step) => {
                  const idx = indexOf(step.code);
                  const done = idx <= currentIndex;
                  return (
                    <div key={step.code} className="flex gap-2">
                      <span className={`w-4 h-4 mt-0.5 rounded-full flex items-center justify-center shrink-0 ${done ? 'bg-emerald-600 text-white' : 'bg-slate-100 border border-slate-300'}`}>
                        {done && <Check size={9} />}
                      </span>
                      <div className="min-w-0">
                        <p className={`text-xs font-semibold ${done ? 'text-slate-800' : 'text-slate-400'}`}>{step.label}</p>
                        {step.description && <p className={`text-[11px] mt-0.5 ${done ? 'text-slate-500' : 'text-slate-300'}`}>{step.description}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StatusTimeline;