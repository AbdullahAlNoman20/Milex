// src/Pages/modules/operations/pages/Shared/NotificationsPage.jsx
import { Link } from 'react-router-dom';
import SectionCard from '../../components/SectionCard';
import Loader from '../../../../../Components/Shared/Loader';
import { useOperationsAuth } from '../../hooks/useOperationsAuth';
import { usePendingTasks } from '../../hooks/usePendingTasks';
import { useClientNotifications } from '../../hooks/useClientNotifications';
import { markHeadMessageRead } from '../../services/requestService';
import { OPERATIONS_ROLES } from '../../constants/operationsRoles';

const ADMIN_TARGET_BY_ROLE = Object.freeze({
  [OPERATIONS_ROLES.DOMESTIC_ADMIN]: '/operations/domestic/delivery-status',
  [OPERATIONS_ROLES.FOREIGN_ADMIN]: '/operations/foreign/delivery-status',
});

const ClientNotifications = () => {
  const { requests, isLoading, reload } = useClientNotifications();
  const items = requests.filter((r) => r.headMessage);

  const handleMarkRead = async (id) => {
    await markHeadMessageRead(id);
    await reload();
  };

  if (isLoading) return <Loader label="Loading notifications..." />;

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-4 md:p-0">
      <div>
        <h1 className="text-xl font-black text-slate-800">Notifications</h1>
        <p className="text-sm text-slate-500">Messages from Operations Head about your requests.</p>
      </div>
      <SectionCard title="All Notifications">
        {items.length === 0 ? (
          <p className="text-sm text-slate-400">No notifications yet.</p>
        ) : (
          <div className="space-y-2">
            {items.map((r) => (
              <div key={r.id} className={`border rounded-lg p-3 flex items-start justify-between gap-3 ${r.headMessageRead ? 'border-slate-100' : 'border-amber-300 bg-amber-50'}`}>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{r.headMessage}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{r.mode} — {r.party?.companyName} · {new Date(r.headMessageAt).toLocaleString()}</p>
                </div>
                <div className="flex flex-col gap-1 items-end shrink-0">
                  <Link to="/operations/client/my-requests" className="text-xs font-bold text-emerald-600 hover:underline">Open Request</Link>
                  {!r.headMessageRead && (
                    <button type="button" onClick={() => handleMarkRead(r.id)} className="text-[10px] font-bold text-slate-400 hover:text-slate-600">Mark as read</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
};

const AdminNotifications = () => {
  const { currentUser } = useOperationsAuth();
  const { shipmentTasks, requestTasks, isLoading } = usePendingTasks();
  const target = ADMIN_TARGET_BY_ROLE[currentUser?.role];

  if (isLoading) return <Loader label="Loading notifications..." />;

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4 md:p-0">
      <div>
        <h1 className="text-xl font-black text-slate-800">Notifications</h1>
        <p className="text-sm text-slate-500">Everything that currently needs your attention.</p>
      </div>

      {requestTasks.length > 0 && (
        <SectionCard title="Requests Awaiting Approval">
          <div className="space-y-2">
            {requestTasks.map((r) => (
              <div key={r.id} className="border border-amber-300 bg-amber-50 rounded-lg p-3 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-800">{r.mode} request from {r.party?.companyName || r.clientEmail}</p>
                <Link to={r.mode === 'IMPORT' ? '/operations/head/import-requests' : '/operations/head/export-requests'} className="text-xs font-bold text-emerald-600 hover:underline">
                  Review
                </Link>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      <SectionCard title="Shipments Awaiting Your Action">
        {shipmentTasks.length === 0 ? (
          <p className="text-sm text-slate-400">Nothing needs your attention right now.</p>
        ) : (
          <div className="space-y-2">
            {shipmentTasks.map((s) => (
              <div key={s.id} className="border border-amber-300 bg-amber-50 rounded-lg p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{s.awbNumber} — {s.statusLabel}</p>
                  <p className="text-[10px] text-slate-400">{s.shipmentMode}</p>
                </div>
                {target && (
                  <Link to={`${target}?awb=${encodeURIComponent(s.awbNumber)}`} className="text-xs font-bold text-emerald-600 hover:underline">
                    Take Action
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
};

const NotificationsPage = () => {
  const { currentUser } = useOperationsAuth();
  return currentUser?.role === OPERATIONS_ROLES.CLIENT ? <ClientNotifications /> : <AdminNotifications />;
};

export default NotificationsPage;