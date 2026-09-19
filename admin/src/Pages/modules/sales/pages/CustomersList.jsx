// admin/src/Pages/modules/sales/pages/CustomersList.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { useSales } from '../hooks/useSales';
import { usePagedCustomers } from '../hooks/usePagedCustomers';
import { STATUS } from '../constants/salesStatus';
import StatusBadge from '../components/StatusBadge';
import Countdown from '../../../../Components/Shared/Countdown';
import Loader from '../../../../Components/Shared/Loader';
import Pagination from '../../../../Components/Shared/Pagination';
import { formatRevision } from '../../../../Components/utils/format';

const TABS = [
  { key: 'customer', label: 'Active Customer' },
  { key: 'provisional', label: 'Provisional Customer' },
  // Everything still being quoted. An account becomes provisional the moment
  // the customer accepts, not before.
  { key: 'pending', label: 'Pending' },
];

const PAGE_SIZE = 10;

const CustomersList = () => {
  const { setSelectedCustomer, reloadToken } = useSales();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(
    TABS.some((t) => t.key === tabParam) ? tabParam : 'customer'
  );
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  // The tab can also arrive from the URL (the dashboard tiles link straight
  // to a specific tab), so this reconciles React state with that external
  // source. It only assigns when the value has actually changed, so there is
  // no cascade.
  useEffect(() => {
    if (tabParam && TABS.some((t) => t.key === tabParam)) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setActiveTab(tabParam);
      setPage(1);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [tabParam]);

  // Anything that narrows the result set also sends the reader back to the
  // first page, done in the handler that caused it rather than in an effect
  // reacting to it afterwards.
  const changeTab = (key) => {
    setActiveTab(key);
    setPage(1);
  };
  const changeSearch = (value) => {
    setSearch(value);
    setPage(1);
  };

  const { items, total, totalPages, counts, isLoading, error } = usePagedCustomers({
    group: activeTab,
    page,
    pageSize: PAGE_SIZE,
    search,
    withCounts: true,
    reloadToken,
  });

  const columnCount = activeTab === 'provisional' ? 7 : 6;

  const openCustomer = (c) => {
    setSelectedCustomer(c);
    navigate(`/app/customers/${encodeURIComponent(c.barcode)}`);
  };

  if (error) return <p className="text-sm text-red-600 font-semibold">{error}</p>;

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h2 className="text-2xl font-bold text-slate-800">Customers</h2>
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

      <div className="flex gap-2 mb-6 border-b border-slate-200 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => changeTab(t.key)}
            className={`px-5 py-2.5 text-sm font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === t.key
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {t.label}{' '}
            <span className="ml-1 text-xs font-normal">({counts ? counts[t.key] : '—'})</span>
          </button>
        ))}
      </div>

      <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[820px]">
          <thead>
            <tr className="border-b border-slate-200 text-xs text-slate-500 font-semibold bg-slate-50">
              <th className="p-4 pl-6">CUSTOMER CODE</th>
              <th className="p-4">ACCOUNT NAME</th>
              <th className="p-4">STATUS</th>
              <th className="p-4">REVISION</th>
              <th className="p-4">ASSIGNED KAM</th>
              {activeTab === 'provisional' && <th className="p-4">DOC WINDOW REMAINING</th>}
              <th className="p-4 pr-6 text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {isLoading ? (
              <tr>
                <td colSpan={columnCount} className="p-10">
                  <Loader label="Loading customers..." />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={columnCount} className="p-8 text-center text-slate-400">
                  {search.trim()
                    ? 'No customer matches your search in this category.'
                    : 'No customers in this category.'}
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
                  </td>
                  <td className="p-4 text-xs font-bold text-slate-500">{formatRevision(c.revision)}</td>
                  <td className="p-4 text-xs font-medium text-slate-500">{c.handledBy?.name || '—'}</td>
                  {activeTab === 'provisional' && (
                    <td className="p-4">
                      {c.status === STATUS.PROVISIONAL_ACTIVE ? (
                        <Countdown expiryDate={c.provisionalExpiryDate} />
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  )}
                  <td className="p-4 pr-6 text-right">
                    <button
                      type="button"
                      onClick={() => openCustomer(c)}
                      className="text-slate-600 hover:text-slate-800 font-semibold text-xs border border-slate-200 px-3 py-1.5 rounded hover:bg-slate-100 transition"
                    >
                      View Profile
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

export default CustomersList;