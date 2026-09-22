// src/Pages/modules/operations/pages/Shared/MyTasksPage.jsx
// One shared page for every role's "what do I need to act on right now" view.
import { Link } from 'react-router-dom';
import SectionCard from '../../components/SectionCard';
import WaitingForBadge from '../../components/WaitingForBadge';
import Loader from '../../../../../Components/Shared/Loader';
import { useOperationsAuth } from '../../hooks/useOperationsAuth';
import { usePendingTasks } from '../../hooks/usePendingTasks';
import { OPERATIONS_ROLES } from '../../constants/operationsRoles';

const DELIVERY_PATH_BY_ROLE = Object.freeze({
  [OPERATIONS_ROLES.DOMESTIC_ADMIN]: '/operations/domestic/delivery-status',
  [OPERATIONS_ROLES.FOREIGN_ADMIN]: '/operations/foreign/delivery-status',
});

const HEAD_QUICK_ACTIONS = Object.freeze([
  { label: 'Manifest Generate', to: '/operations/head/manifest' },
  { label: 'Route Planning', to: '/operations/head/route-planning' },
  { label: 'Request Pickup', to: '/operations/head/pickup-request' },
]);

const MyTasksPage = () => {
  const { currentUser } = useOperationsAuth();
  const { shipmentTasks, requestTasks, isLoading } = usePendingTasks();
  const deliveryPath = DELIVERY_PATH_BY_ROLE[currentUser?.role];

  if (isLoading) return <Loader label="Loading your tasks..." />;

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4 md:p-0">
      <div>
        <h1 className="text-xl font-black text-slate-800">My Tasks</h1>
        <p className="text-sm text-slate-500">Everything currently waiting on your action.</p>
      </div>

      {currentUser?.role === OPERATIONS_ROLES.OPERATIONS_HEAD && (
        <SectionCard title="Quick Actions">
          <div className="flex flex-wrap gap-3">
            {HEAD_QUICK_ACTIONS.map((a) => (
              <Link key={a.to} to={a.to} className="text-xs font-bold bg-slate-800 text-white px-3 py-2 rounded-lg hover:bg-slate-900 transition">
                {a.label}
              </Link>
            ))}
          </div>
        </SectionCard>
      )}

      {requestTasks.length > 0 && (
        <SectionCard title={`Requests Awaiting Approval (${requestTasks.length})`}>
          <div className="space-y-2">
            {requestTasks.map((r) => (
              <div key={r.id} className="border border-slate-100 rounded-lg p-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-slate-700">{r.party?.companyName || '—'}</p>
                  <p className="text-xs text-slate-400">{r.mode} · {r.clientEmail} · {r.parcel?.shipmentContents}</p>
                </div>
                <Link
                  to={r.mode === 'IMPORT' ? '/operations/head/import-requests' : '/operations/head/export-requests'}
                  className="text-xs font-bold bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition"
                >
                  View
                </Link>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      <SectionCard title={`Shipments Awaiting Your Action (${shipmentTasks.length})`}>
        {shipmentTasks.length === 0 ? (
          <p className="text-sm text-slate-400">Nothing is currently waiting on you.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100">
                  <th className="py-2 pr-4">AWB / CN</th>
                  <th className="py-2 pr-4">Mode</th>
                  <th className="py-2 pr-4">Current Status</th>
                  <th className="py-2 pr-4">Currently Waiting On</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {shipmentTasks.map((s) => (
                  <tr key={s.id} className="border-b border-slate-50 last:border-b-0">
                    <td className="py-3 pr-4 font-bold text-slate-700">{s.awbNumber}</td>
                    <td className="py-3 pr-4 text-slate-600">{s.shipmentMode}</td>
                    <td className="py-3 pr-4 text-slate-600">{s.statusLabel}</td>
                    <td className="py-3 pr-4">
                      <WaitingForBadge mode={s.shipmentMode} statusCode={s.statusCode} exceptionCode={s.exceptionCode} />
                    </td>
                    <td className="py-3 space-x-2">
                      <Link to={`/operations/documents/awb/${encodeURIComponent(s.awbNumber)}`} className="text-xs font-bold text-emerald-600 hover:underline">
                        View
                      </Link>
                      {deliveryPath && (
                        <Link to={`${deliveryPath}?awb=${encodeURIComponent(s.awbNumber)}`} className="text-xs font-bold bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition">
                          Update
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
};

export default MyTasksPage;