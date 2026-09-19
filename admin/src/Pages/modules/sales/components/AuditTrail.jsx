// admin/src/Pages/modules/sales/components/AuditTrail.jsx
import { useState, useEffect } from "react";
import { Clock, X } from "lucide-react";

const TimelineNode = ({ title, subText, timestamp, isActive, isPending, isCompleted }) => (
  <div className="relative flex items-start">
    <div
      className={`flex items-center justify-center w-6 h-6 rounded-full border-4 border-white shrink-0 z-10 ${
        isActive
          ? "bg-emerald-500 shadow-[0_0_0_2px_rgba(16,185,129,0.3)]"
          : isPending
            ? "bg-amber-400"
            : isCompleted
              // A finished step reads as done at a glance, which is the whole
              // point of the trail — grey made every past step look skipped.
              ? "bg-emerald-500"
              : "bg-slate-300"
      }`}
    />
    <div className="ml-4 -mt-1 w-full">
      <p
        className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${
          isActive
            ? "text-emerald-700"
            : isPending
              ? "text-amber-600"
              : isCompleted
                ? "text-emerald-700"
                : "text-slate-500"
        }`}
      >
        {title}
      </p>
      {subText && <p className="text-[11px] text-slate-600 mb-1">{subText}</p>}
      <p className="text-[10px] text-slate-400 font-mono">
        {timestamp || (isPending ? "In progress" : "")}
      </p>
    </div>
  </div>
);


const PREVIEW_LIMIT = 8;

const TimelineList = ({ items, activeLabel }) => (
  <div className="space-y-8 relative before:absolute before:inset-0 before:ml-[11px] before:h-full before:w-[2px] before:bg-slate-200">
    {activeLabel && <TimelineNode title={activeLabel} isPending />}
    {items.map((h, i) => (
      <TimelineNode
        key={h.id || `${h.action}-${i}`}
        title={h.action}
        subText={h.subText}
        timestamp={h.createdAt ? new Date(h.createdAt).toLocaleString() : ""}
        isActive={h.status === "active"}
        isCompleted={h.status !== "active"}
      />
    ))}
  </div>
);

const AuditTrail = ({ history = [], activeStepLabel = "" }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!isModalOpen) return undefined;
    const onKey = (e) => e.key === "Escape" && setIsModalOpen(false);
    const prevOverflow = document.body.style.overflow;
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isModalOpen]);
  const safeHistory = Array.isArray(history) ? history : [];
  const hasActiveStep = safeHistory.some((h) => h.status === "active");

  // Newest first, oldest at the bottom. The server already returns them in
  // this order, but sorting here as well means the view is correct even if a
  // caller hands over an unordered list.
  const ordered = [...safeHistory].sort((a, b) => {
    const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bt - at;
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-3 flex items-center border-b border-slate-100">
        <Clock size={18} className="text-slate-400 mr-2" />
        <h3 className="font-bold text-base text-slate-800">Process Audit Trail</h3>
      </div>
      <div className="p-6 pb-8">
        {ordered.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">No history recorded yet.</p>
        ) : (
          <>
            <TimelineList
              items={ordered.slice(0, PREVIEW_LIMIT)}
              activeLabel={hasActiveStep ? activeStepLabel : ""}
            />

            {ordered.length > PREVIEW_LIMIT && (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="mt-6 w-full text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md py-2.5 hover:bg-emerald-100 transition"
              >
                See more ({ordered.length - PREVIEW_LIMIT} more)
              </button>
            )}

            {isModalOpen && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
                onClick={() => setIsModalOpen(false)}
              >
                <div
                  role="dialog"
                  aria-modal="true"
                  className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-5 flex items-center justify-between border-b border-slate-100 shrink-0">
                    <div className="flex items-center">
                      <Clock size={18} className="text-slate-400 mr-2" />
                      <h3 className="font-bold text-base text-slate-800">
                        Process Audit Trail
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 transition"
                      aria-label="Close"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div className="p-6 pb-8 overflow-y-auto">
                    <TimelineList
                      items={ordered}
                      activeLabel={hasActiveStep ? activeStepLabel : ""}
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AuditTrail;