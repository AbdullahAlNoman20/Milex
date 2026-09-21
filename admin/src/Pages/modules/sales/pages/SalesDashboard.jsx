// admin/src/Pages/modules/sales/pages/SalesDashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, ShieldCheck, Target, Clock, Plus, UserCog } from 'lucide-react';
import { listTeam } from '../services/teamService';
import { ROLES } from '../../../../Components/constants/roles';
import { useSales } from '../hooks/useSales';
import { usePagedCustomers } from '../hooks/usePagedCustomers';
import { useAuth } from '../../../../Components/hooks/useAuth';
import { hasPermission, PERMISSIONS } from '../../../../Components/constants/permissions';
import StatusBadge, { RateProcessBadge } from '../components/StatusBadge';
import Loader from '../../../../Components/Shared/Loader';
import Pagination from '../../../../Components/Shared/Pagination';

const PAGE_SIZE = 8;

const SalesDashboard = () => {
  const { currentUser } = useAuth();
  const { setSelectedCustomer, reloadToken } = useSales();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  // Knowing who to escalate to is part of doing the job, and on a team of
  // any size it is not something people reliably remember.
  const [manager, setManager] = useState(null);
  const reportsUpward =
    currentUser?.role === ROLES.KAM || currentUser?.role === ROLES.SALES_COORDINATOR;

  useEffect(() => {
    if (!reportsUpward) return undefined;
    let cancelled = false;
    listTeam()
      .then((data) => {
        if (!cancelled) setManager(data.manager || null);
      })
      .catch(() => {
        if (!cancelled) setManager(null);
      });
    return () => {
      cancelled = true;
    };
  }, [reportsUpward]);

  // The role's own action queue and every headline figure are computed in the
  // database. They used to be derived by filtering a complete download of the
  // customer table, which meant the dashboard's cost grew with the company.
  const { items, total, totalPages, counts, isLoading, error } = usePagedCustomers({
    group: 'queue',
    page,
    pageSize: PAGE_SIZE,
    withCounts: true,
    reloadToken,
  });

  const activeCount = counts?.customer ?? 0;
  const pipelineCount = counts?.pipeline ?? 0;
  const totalCount = counts?.all ?? 0;

  const openCustomer = (task) => {
    setSelectedCustomer(task);
    navigate(`/app/customers/${encodeURIComponent(task.barcode)}`);
  };

  if (isLoading && !counts) return <Loader fullScreen label="Loading dashboard..." />;
  if (error) return <p className="text-sm text-red-600 font-semibold">{error}</p>;

  return (
    <div className="max-w-7xl px-3 sm:mx-auto animate-in fade-in duration-300">
      <div className="mb-6 flex flex-col sm:flex-row sm:flex-wrap justify-between sm:items-end gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Overview</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">Key Account Performance &amp; Activity</p>
        </div>
        {hasPermission(currentUser?.role, PERMISSIONS.CREATE_RECOMMENDATION) && (
          <button
            type="button"
            onClick={() => navigate('/app/recommendations/new')}
            className="w-full sm:w-auto bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-lg text-sm shadow-md hover:bg-emerald-800 transition flex items-center justify-center"
          >
            <Plus size={16} className="mr-2" /> New Recommendation
          </button>
        )}
      </div>

      {reportsUpward && (
        <div className="mb-5 bg-white rounded-xl border border-slate-200 px-4 sm:px-5 py-3 flex items-center gap-3">
          <UserCog size={16} className="text-slate-400 shrink-0" />
          <p className="text-xs text-slate-600 min-w-0">
            Your Line Manager:{' '}
            <strong className="text-slate-800">
              {manager?.name || 'not assigned yet'}
            </strong>
            {manager?.email && (
              <span className="text-slate-400 break-words"> · {manager.email}</span>
            )}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <button
          type="button"
          onClick={() => navigate('/app/customers?tab=customer')}
          className="text-left bg-white p-5 rounded-xl shadow-sm border border-slate-100 hover:shadow-md hover:border-blue-200 transition"
        >
          <div className="w-8 h-8 rounded bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <LayoutDashboard size={16} />
          </div>
          <p className="text-xs text-slate-500 font-medium mb-1">Active Accounts</p>
          <p className="text-2xl font-bold text-slate-800">{activeCount}</p>
        </button>
        <button
          type="button"
          onClick={() => navigate('/app/tasks')}
          className="text-left bg-white p-5 rounded-xl shadow-sm border border-slate-100 hover:shadow-md hover:border-indigo-200 transition"
        >
          <div className="w-8 h-8 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
            <FileText size={16} />
          </div>
          <p className="text-xs text-slate-500 font-medium mb-1">Pipeline Accounts</p>
          <p className="text-2xl font-bold text-slate-800">{pipelineCount}</p>
        </button>
        <button
          type="button"
          onClick={() => navigate('/app/tasks')}
          className="text-left bg-white p-5 rounded-xl shadow-sm border border-slate-100 hover:shadow-md hover:border-emerald-200 transition"
        >
          <div className="w-8 h-8 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
            <ShieldCheck size={16} />
          </div>
          <p className="text-xs text-slate-500 font-medium mb-1">Your Queue</p>
          <p className="text-2xl font-bold text-slate-800">{counts?.queue ?? 0}</p>
        </button>
        <div className="bg-gradient-to-br from-emerald-800 to-slate-900 p-5 rounded-xl border border-emerald-900 text-white">
          <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center mb-3">
            <Target size={16} />
          </div>
          <p className="text-xs text-emerald-100 font-medium mb-1">Active Ratio</p>
          <p className="text-3xl font-bold">
            {totalCount ? Math.round((activeCount / totalCount) * 100) : 0}
            <span className="text-lg font-normal">%</span>
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-emerald-50/50 flex justify-between items-center">
          <h3 className="font-bold text-emerald-900 flex items-center text-sm">
            <Clock size={16} className="mr-2 text-emerald-600" /> Action Required Queue
          </h3>
          <button
            type="button"
            onClick={() => navigate('/app/tasks')}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
          >
            View All
          </button>
        </div>
        <div className="divide-y divide-slate-100 min-h-[160px]">
          {isLoading ? (
            <div className="p-8">
              <Loader label="Loading queue..." />
            </div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-slate-400 font-medium">No tasks pending for your role</div>
          ) : (
            items.map((task) => (
              <div
                key={task.id}
                className="p-3 sm:p-4 hover:bg-slate-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4"
              >
                <button type="button" onClick={() => openCustomer(task)} className="min-w-0 text-left">
                  <p className="font-bold text-slate-800 truncate hover:text-emerald-700 transition">
                    {task.accountName}
                  </p>
                  <div className="flex items-center mt-1 gap-3 flex-wrap">
                    <span className="font-mono text-xs text-slate-500 border rounded px-1.5">{task.barcode}</span>
                    <StatusBadge status={task.status} size="sm" />
                    <RateProcessBadge customer={task} />
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => openCustomer(task)}
                  className="shrink-0 text-emerald-600 font-semibold text-sm hover:underline border px-4 py-1.5 rounded border-emerald-200 hover:bg-emerald-50 transition w-full sm:w-auto text-center"
                >
                  Process Task
                </button>
              </div>
            ))
          )}
        </div>
        <Pagination
          page={page}
          totalPages={totalPages}
          totalItems={total}
          pageSize={PAGE_SIZE}
          onChange={setPage}
          className="px-4"
        />
      </div>
    </div>
  );
};

export default SalesDashboard;