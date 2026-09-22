// src/Pages/modules/operations/components/SectionCard.jsx
const SectionCard = ({ title, subtitle, children, actions }) => (
  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
    <div className="flex items-start justify-between mb-4 gap-3">
      <div>
        <h2 className="text-sm font-black text-slate-700 uppercase tracking-wide">{title}</h2>
        {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
    {children}
  </div>
);

export default SectionCard;