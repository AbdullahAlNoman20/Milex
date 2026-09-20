// admin/src/Pages/modules/sales/pages/CustomerAssignmentsPage.jsx
import { useState, useEffect } from 'react';
import { Search, X, Loader2, UserCog, History } from 'lucide-react';
import AssignmentHistoryCard from '../components/AssignmentHistoryCard';
import { usePagedCustomers } from '../hooks/usePagedCustomers';
import { listKams } from '../services/teamService';
import { reassignCustomer } from '../services/customerService';
import { useToast } from '../../../../Components/hooks/useToast';
import { useConfirm } from '../../../../Components/hooks/useConfirm';
import Loader from '../../../../Components/Shared/Loader';
import Pagination from '../../../../Components/Shared/Pagination';

const PAGE_SIZE = 12;

// One screen for the whole book of business: who holds which account, and the
// ability to move any of them. The same action exists on an individual
// customer's own page, but reassigning several at once is far easier when
// they are all listed together.
const CustomerAssignmentsPage = () => {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [kams, setKams] = useState([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [reloadToken, setReloadToken] = useState(0);
  const [pendingId, setPendingId] = useState(null);
  // The chain of custody for one account, opened from its own row rather
  // than by navigating away and coming back.
  const [historyFor, setHistoryFor] = useState(null);

  useEffect(() => {
    listKams({ includeManagers: true })
      .then(setKams)
      .catch(() => setKams([]));
  }, []);

  const changeSearch = (value) => {
    setSearch(value);
    setPage(1);
  };

  const { items, total, totalPages, isLoading, error } = usePagedCustomers({
    page,
    pageSize: PAGE_SIZE,
    search,
    reloadToken,
  });

  const assign = async (customer, kamId) => {
    if (!kamId || kamId === customer.handledById) return;
    const target = kams.find((k) => k.id === kamId);
    const ok = await confirm({
      title: 'Reassign this customer?',
      message: `${customer.accountName} will move from ${customer.handledBy?.name || 'nobody'} to ${target?.name}. A customer only ever has one Key Account Manager, so the previous one loses access to this record.`,
      confirmLabel: 'Reassign',
    });
    if (!ok) return;
    setPendingId(customer.id);
    try {
      await reassignCustomer(customer.id, kamId);
      showToast(`${customer.accountName} is now handled by ${target?.name}`, 'success');
      setReloadToken((t) => t + 1);
    } catch (err) {
      showToast(err?.message || 'Could not reassign this customer', 'error');
    } finally {
      setPendingId(null);
    }
  };

  if (error) return <p className="text-sm text-red-600 font-semibold">{error}</p>;

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-300 px-1">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
            <UserCog size={22} className="text-slate-400" /> Customer Assignments
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            See who holds each account and move it to a different Key Account Manager.
          </p>
        </div>
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
        <table className="w-full text-left border-collapse min-w-[760px]">
          <thead>
            <tr className="border-b border-slate-200 text-xs text-slate-500 font-semibold bg-slate-50">
              <th className="p-4 pl-6">CUSTOMER CODE</th>
              <th className="p-4">ACCOUNT NAME</th>
              <th className="p-4">CURRENT KAM</th>
              <th className="p-4">ASSIGN TO</th>
              <th className="p-4 pr-6 text-right">HISTORY</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="p-10">
                  <Loader label="Loading customers..." />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400">
                  {search.trim() ? 'No customer matches your search.' : 'No customers yet.'}
                </td>
              </tr>
            ) : (
              items.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition">
                  <td className="p-4 pl-6 font-mono text-slate-600">{c.barcode}</td>
                  <td className="p-4 font-bold text-slate-800">{c.accountName}</td>
                  <td className="p-4 text-xs font-medium text-slate-500">
                    {c.handledBy?.name || <span className="text-amber-600">Unassigned</span>}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <select
                        disabled={pendingId === c.id}
                        value=""
                        onChange={(e) => assign(c, e.target.value)}
                        className="w-full max-w-[220px] border border-slate-200 p-2 rounded-lg text-xs bg-white outline-none focus:border-emerald-500 disabled:opacity-50"
                      >
                        <option value="">Choose a KAM…</option>
                        {kams
                          .filter((k) => k.id !== c.handledById)
                          .map((k) => (
                            <option key={k.id} value={k.id}>
                              {k.name}
                            </option>
                          ))}
                      </select>
                      {pendingId === c.id && (
                        <Loader2 size={14} className="animate-spin text-slate-400 shrink-0" />
                      )}
                    </div>
                  </td>
                  <td className="p-4 pr-6 text-right">
                    <button
                      type="button"
                      onClick={() => setHistoryFor(c)}
                      aria-label={`Ownership history for ${c.accountName}`}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 border border-slate-200 px-3 py-1.5 rounded hover:bg-slate-100 transition"
                    >
                      <History size={13} /> View
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

      {historyFor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setHistoryFor(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 flex items-center justify-between border-b border-slate-100 shrink-0">
              <div className="min-w-0">
                <h3 className="font-bold text-base text-slate-800 truncate">{historyFor.accountName}</h3>
                <p className="text-xs text-slate-400 font-mono">{historyFor.barcode}</p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryFor(null)}
                aria-label="Close"
                className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 transition shrink-0"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 overflow-y-auto">
              <AssignmentHistoryCard customer={historyFor} reloadToken={reloadToken} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerAssignmentsPage;