// src/Pages/modules/operations/pages/OperationsHead/OperationsHeadDashboard.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import SectionCard from '../../components/SectionCard';
import Loader from '../../../../../Components/Shared/Loader';
import { useOperationsAuth } from '../../hooks/useOperationsAuth';
import { fetchShipments } from '../../services/shipmentService';
import { fetchRequests, REQUEST_STATUS } from '../../services/requestService';
import { fetchStatusLogs } from '../../services/statusLogService';
import { fetchClaims, CLAIM_STATUS } from '../../services/claimService';
import { fetchReturns } from '../../services/returnService';
import { usePendingTasks } from '../../hooks/usePendingTasks';

// Number-first summary tile — no icons, per Milex's dashboard spec.
const SummaryTile = ({ label, value, to }) => (
  <Link to={to} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:border-emerald-300 transition block">
    <p className="text-3xl font-black text-slate-800">{value}</p>
    <p className="text-xs font-bold text-slate-500 mt-1">{label}</p>
  </Link>
);

const OperationsHeadDashboard = () => {
  const { currentUser } = useOperationsAuth();
  const { totalCount: myTaskCount } = usePendingTasks();
  const [shipments, setShipments] = useState([]);
  const [requests, setRequests] = useState([]);
  const [logs, setLogs] = useState([]);
  const [claims, setClaims] = useState([]);
  const [returns, setReturns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [shipmentRecords, requestRecords, logRecords, claimRecords, returnRecords] = await Promise.all([
        fetchShipments(), fetchRequests(), fetchStatusLogs(), fetchClaims(), fetchReturns(),
      ]);
      setShipments(shipmentRecords);
      setRequests(requestRecords);
      setLogs(logRecords.slice(0, 6));
      setClaims(claimRecords);
      setReturns(returnRecords);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => ({
    total: shipments.length,
    inTransit: shipments.filter((s) => s.statusCode !== 'DELIVERED' && !s.pod).length,
    exceptions: shipments.filter((s) => s.exceptionCode).length,
    pendingRequests: requests.filter((r) => r.status === REQUEST_STATUS.PENDING).length,
    openClaims: claims.filter((c) => c.status === CLAIM_STATUS.UNDER_REVIEW).length,
    openReturns: returns.length,
  }), [shipments, requests, claims, returns]);

  if (isLoading) return <Loader label="Loading dashboard..." />;

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4 md:p-0">
      <div>
        <h1 className="text-xl font-black text-slate-800">Welcome, {currentUser?.name}</h1>
        <p className="text-sm text-slate-500">Company-wide operations overview.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <SummaryTile label="My Tasks" value={myTaskCount} to="/operations/head/tasks" />
        <SummaryTile label="Booking Summary" value={stats.total} to="/operations/head/bookings" />
        <SummaryTile label="In Transit" value={stats.inTransit} to="/operations/head/tracking" />
        <SummaryTile label="Exceptions" value={stats.exceptions} to="/operations/head/status-log" />
        <SummaryTile label="Pending Requests" value={stats.pendingRequests} to="/operations/foreign/import-requests" />
        <SummaryTile label="Open Claims" value={stats.openClaims} to="/operations/head/claims" />
        <SummaryTile label="Returns" value={stats.openReturns} to="/operations/head/returns" />
        <SummaryTile label="Customers" value={new Set(shipments.map((s) => s.receiver?.companyName)).size} to="/operations/head/customers" />
        <SummaryTile label="Manifests" value="—" to="/operations/head/manifest" />
      </div>

      <SectionCard title="Recent Activity">
        {logs.length === 0 ? (
          <p className="text-sm text-slate-400">No activity yet.</p>
        ) : (
          <div className="space-y-3">
            {logs.map((l) => (
              <div key={l.id} className="flex items-start justify-between border-b border-slate-50 last:border-b-0 pb-2">
                <div>
                  <p className="text-sm font-bold text-slate-700">{l.awbNumber}</p>
                  <p className="text-xs text-slate-500">{l.status}</p>
                </div>
                <p className="text-[10px] text-slate-400">{new Date(l.updatedAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
};

export default OperationsHeadDashboard;