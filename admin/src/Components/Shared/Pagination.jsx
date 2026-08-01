// admin/src/Components/Shared/Pagination.jsx 
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const buildPageList = (current, total) => {
  const pages = [];
  const start = Math.max(1, current - 1);
  const end = Math.min(total, current + 1);
  if (start > 1) {
    pages.push(1);
    if (start > 2) pages.push('...');
  }
  for (let i = start; i <= end; i += 1) pages.push(i);
  if (end < total) {
    if (end < total - 1) pages.push('...');
    pages.push(total);
  }
  return pages;
};

const Pagination = ({ page, totalPages, totalItems, pageSize, onChange, className = '' }) => {
  if (totalPages <= 1) return null;
  const pages = buildPageList(page, totalPages);
  const rangeStart = totalItems ? (page - 1) * pageSize + 1 : 0;
  const rangeEnd = totalItems ? Math.min(page * pageSize, totalItems) : 0;

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 px-1 py-4 ${className}`}>
      {typeof totalItems === 'number' && (
        <span className="text-xs text-slate-400 font-semibold">
          Showing {rangeStart}–{rangeEnd} of {totalItems}
        </span>
      )}
      <div className="flex items-center gap-1 ml-auto">
        <button type="button" disabled={page <= 1} onClick={() => onChange(1)} aria-label="First page" className="w-8 h-8 rounded-lg border border-slate-200 text-slate-500 inline-flex items-center justify-center disabled:opacity-40 hover:bg-slate-50 transition">
          <ChevronsLeft size={14} />
        </button>
        <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page" className="w-8 h-8 rounded-lg border border-slate-200 text-slate-500 inline-flex items-center justify-center disabled:opacity-40 hover:bg-slate-50 transition">
          <ChevronLeft size={14} />
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`e-${i}`} className="w-8 h-8 inline-flex items-center justify-center text-xs text-slate-400">…</span>
          ) : (
            <button key={p} type="button" onClick={() => onChange(p)} className={`w-8 h-8 rounded-lg text-xs font-bold transition inline-flex items-center justify-center ${p === page ? 'bg-emerald-700 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {p}
            </button>
          )
        )}
        <button type="button" disabled={page >= totalPages} onClick={() => onChange(page + 1)} aria-label="Next page" className="w-8 h-8 rounded-lg border border-slate-200 text-slate-500 inline-flex items-center justify-center disabled:opacity-40 hover:bg-slate-50 transition">
          <ChevronRight size={14} />
        </button>
        <button type="button" disabled={page >= totalPages} onClick={() => onChange(totalPages)} aria-label="Last page" className="w-8 h-8 rounded-lg border border-slate-200 text-slate-500 inline-flex items-center justify-center disabled:opacity-40 hover:bg-slate-50 transition">
          <ChevronsRight size={14} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;