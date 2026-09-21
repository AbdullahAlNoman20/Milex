// admin/src/Pages/modules/sales/pages/TaskQueue.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { useSales } from '../hooks/useSales';
import { usePagedCustomers } from '../hooks/usePagedCustomers';
import StatusBadge, { RateProcessBadge } from '../components/StatusBadge';
import Loader from '../../../../Components/Shared/Loader';
import Pagination from '../../../../Components/Shared/Pagination';
import { formatRevision } from '../../../../Components/utils/format';

const PAGE_SIZE = 10;

const TaskQueue = () => {
  const { setSelectedCustomer, reloadToken } = useSales();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const changeSearch = (value) => {
    setSearch(value);
    setPage(1);
  };

  const { items, total, totalPages, isLoading, error } = usePagedCustomers({
    group: 'pipeline',
    page,
    pageSize: PAGE_SIZE,
    search,
    reloadToken,
  });

  const openCustomer = (c) => {
    setSelectedCustomer(c);
    navigate(`/app/customers/${encodeURIComponent(c.barcode)}`);
  };

  if (error) return <p className="text-sm text-red-600 font-semibold">{error}</p>;

  return (
    <div className="max-w-7xl px-3 sm:mx-auto animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Task Queue &amp; In-Progress Workflows</h2>
        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => changeSearch(e.target.value)}
            maxLength={100}
            placeholder="Search name, code or reference..."
            className="w-full pl-9 pr-8 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
          {search && (
            <button
              type="button"
              onClick={() => changeSearch('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[720px]">
          <thead>
            <tr className="border-b border-slate-200 text-xs text-slate-500 font-semibold bg-slate-50">
              <th className="p-4 pl-6">IDENTIFIER</th>
              <th className="p-4">ACCOUNT NAME</th>
              <th className="p-4">CURRENT STATUS</th>
              <th className="p-4">REVISION</th>
              <th className="p-4">ASSIGNED KAM</th>
              <th className="p-4 pr-6 text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="p-10">
                  <Loader label="Loading tasks..." />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">
                  {search.trim() ? 'No task matches your search.' : 'No active tasks.'}
                </td>
              </tr>
            ) : (
              items.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition">
                  <td className="p-4 pl-6 font-mono text-slate-600">{c.barcode}</td>
                  <td className="p-4 font-bold">
                    <button
                      type="button"
                      onClick={() => openCustomer(c)}
                      className="text-slate-800 hover:text-emerald-700 hover:underline transition text-left"
                    >
                      {c.accountName}
                    </button>
                  </td>
                  <td className="p-4">
                    <StatusBadge status={c.status} size="sm" />
                    {c.offerRejected && (
                      <span className="block mt-1 text-[9px] font-bold uppercase text-red-600">
                        Offer rejected
                      </span>
                    )}
                    <RateProcessBadge customer={c} />
                  </td>
                  <td className="p-4 text-xs font-bold text-slate-500">{formatRevision(c.revision)}</td>
                  <td className="p-4 text-xs font-medium text-slate-500">{c.handledBy?.name || '—'}</td>
                  <td className="p-4 pr-6 text-right">
                    <button
                      type="button"
                      onClick={() => openCustomer(c)}
                      className="text-emerald-600 hover:text-emerald-800 font-semibold text-xs border border-emerald-200 px-3 py-1.5 rounded hover:bg-emerald-50 transition"
                    >
                      Open Record
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pagination
        page={page}
        totalPages={totalPages}
        totalItems={total}
        pageSize={PAGE_SIZE}
        onChange={setPage}
      />
    </div>
  );
};

export default TaskQueue;