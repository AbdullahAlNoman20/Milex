// src/Pages/modules/sales/pages/SalesDashboard.jsx
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, ShieldCheck, Target, Clock } from 'lucide-react';
import { useSales } from '../hooks/useSales';
import { useAuth } from '../../../../Components/hooks/useAuth';
import { ROLES } from '../../../../Components/constants/roles';
import { STATUS } from '../constants/salesStatus';
import StatusBadge from '../components/StatusBadge';
import Loader from '../../../../Components/Shared/Loader';

const roleQueueFilter = (role) => (c) => {
  if (c.status === STATUS.ACTIVE) return false;
  switch (role) {
    case ROLES.SALES_COORDINATOR:
      return [
        STATUS.PENDING_RATE,
        STATUS.APPROVED_PENDING_OFFER,
        STATUS.OFFER_DRAFTING,
        STATUS.OFFER_REJECTED,
        STATUS.PENDING_AGREEMENT,
        STATUS.AGREEMENT_DRAFTING,
      ].includes(c.status);
    case ROLES.LINE_MANAGER:
      return [STATUS.PENDING_APPROVAL, STATUS.INFO_UPDATE_PENDING].includes(c.status);
    case ROLES.KAM:
      return [STATUS.OFFER_REVIEW, STATUS.AGREEMENT_REVIEW, STATUS.PENDING_PROFILE].includes(c.status);
    default:
      return false;
  }
};

const SalesDashboard = () => {
  const { currentUser } = useAuth();
  const { customers, isLoading, loadError, setSelectedCustomer } = useSales();
  const navigate = useNavigate();

  const pendingTasks = useMemo(
    () => customers.filter(roleQueueFilter(currentUser?.role)),
    [customers, currentUser]
  );

  const activeCount = useMemo(() => customers.filter((c) => c.status === STATUS.ACTIVE).length, [customers]);
  const pipelineCount = customers.length - activeCount;

  const openCustomer = (task) => {
    setSelectedCustomer(task);
    navigate(`/app/customers/${encodeURIComponent(task.barcode)}`);
  };

  if (isLoading) return <Loader fullScreen label="Loading dashboard..." />;
  if (loadError) return <p className="text-sm text-red-600 font-semibold">{loadError}</p>;

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-300">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Overview</h2>
        <p className="text-sm text-slate-500 mt-1">Key Account Performance & Activity</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
          <div className="w-8 h-8 rounded bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <LayoutDashboard size={16} />
          </div>
          <p className="text-xs text-slate-500 font-medium mb-1">Active Accounts</p>
          <p className="text-2xl font-bold text-slate-800">{activeCount}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
          <div className="w-8 h-8 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
            <FileText size={16} />
          </div>
          <p className="text-xs text-slate-500 font-medium mb-1">Pipeline Accounts</p>
          <p className="text-2xl font-bold text-slate-800">{pipelineCount}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
          <div className="w-8 h-8 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
            <ShieldCheck size={16} />
          </div>
          <p className="text-xs text-slate-500 font-medium mb-1">Your Queue</p>
          <p className="text-2xl font-bold text-slate-800">{pendingTasks.length}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-800 to-slate-900 p-5 rounded-xl border border-emerald-900 text-white">
          <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center mb-3">
            <Target size={16} />
          </div>
          <p className="text-xs text-emerald-100 font-medium mb-1">Active Ratio</p>
          <p className="text-3xl font-bold">
            {customers.length ? Math.round((activeCount / customers.length) * 100) : 0}
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
          {pendingTasks.length === 0 ? (
            <div className="p-8 text-center text-slate-400 font-medium">No tasks pending for your role</div>
          ) : (
            pendingTasks.map((task) => (
              <div key={task.id} className="p-4 hover:bg-slate-50 transition flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 truncate">{task.accountName}</p>
                  <div className="flex items-center mt-1 gap-3 flex-wrap">
                    <span className="font-mono text-xs text-slate-500 border rounded px-1.5">{task.barcode}</span>
                    <StatusBadge status={task.status} size="sm" />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openCustomer(task)}
                  className="shrink-0 text-emerald-600 font-semibold text-sm hover:underline border px-4 py-1.5 rounded border-emerald-200 hover:bg-emerald-50 transition"
                >
                  Process Task
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SalesDashboard;