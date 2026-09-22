// src/Pages/modules/operations/pages/ForeignAdmin/ForeignAdminDashboard.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useOperationsAuth } from '../../hooks/useOperationsAuth';
import { usePendingTasks } from '../../hooks/usePendingTasks';
import { fetchShipments } from '../../services/shipmentService';
import { fetchRequests, REQUEST_STATUS } from '../../services/requestService';
import Loader from '../../../../../Components/Shared/Loader';

const SummaryTile = ({ label, value, to }) => (
  <Link to={to} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:border-emerald-300 transition block">
    <p className="text-3xl font-black text-slate-800">{value}</p>
    <p className="text-xs font-bold text-slate-500 mt-1">{label}</p>
  </Link>
);

const ForeignAdminDashboard = () => {
  const { currentUser } = useOperationsAuth();
  const { totalCount: myTaskCount } = usePendingTasks();
  const [shipments, setShipments] = useState([]);
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [shipmentRecords, requestRecords] = await Promise.all([fetchShipments(), fetchRequests()]);
      setShipments(shipmentRecords);
      setRequests(requestRecords);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => ({
    total: shipments.filter((s) => s.shipmentMode === 'IMPORT').length,
    pendingImport: requests.filter((r) => r.mode === 'IMPORT' && r.status === REQUEST_STATUS.PENDING).length,
    pendingExport: requests.filter((r) => r.mode === 'EXPORT' && r.status === REQUEST_STATUS.PENDING).length,
  }), [shipments, requests]);

  if (isLoading) return <Loader label="Loading dashboard..." />;

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4 md:p-0">
      <div>
        <h1 className="text-xl font-black text-slate-800">Welcome, {currentUser?.name}</h1>
        <p className="text-sm text-slate-500">Foreign / origin-side operations overview.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <SummaryTile label="My Tasks" value={myTaskCount} to="/operations/foreign/tasks" />
        <SummaryTile label="Import Shipments" value={stats.total} to="/operations/foreign/shipment-history" />
        <SummaryTile label="Import Requests" value={stats.pendingImport} to="/operations/foreign/import-requests" />
        <SummaryTile label="Export Requests" value={stats.pendingExport} to="/operations/foreign/export-requests" />
        <SummaryTile label="Generate AWB" value="+" to="/operations/foreign/awb" />
        <SummaryTile label="Track Shipment" value="→" to="/operations/foreign/tracking" />
        <SummaryTile label="Pickups" value="→" to="/operations/foreign/pickups" />
      </div>
    </div>
  );
};

export default ForeignAdminDashboard;