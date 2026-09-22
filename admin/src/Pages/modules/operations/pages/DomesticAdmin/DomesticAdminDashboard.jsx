// src/Pages/modules/operations/pages/DomesticAdmin/DomesticAdminDashboard.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useOperationsAuth } from '../../hooks/useOperationsAuth';
import { usePendingTasks } from '../../hooks/usePendingTasks';
import { fetchShipments } from '../../services/shipmentService';
import Loader from '../../../../../Components/Shared/Loader';

const SummaryTile = ({ label, value, to }) => (
  <Link to={to} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:border-emerald-300 transition block">
    <p className="text-3xl font-black text-slate-800">{value}</p>
    <p className="text-xs font-bold text-slate-500 mt-1">{label}</p>
  </Link>
);

const DomesticAdminDashboard = () => {
  const { currentUser } = useOperationsAuth();
  const { totalCount: myTaskCount } = usePendingTasks();
  const [shipments, setShipments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setShipments(await fetchShipments());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const exportShipments = shipments.filter((s) => s.shipmentMode === 'EXPORT');
    return {
      total: exportShipments.length,
      pendingPickup: exportShipments.filter((s) => s.statusCode === 'BOOKED').length,
      pendingDelivery: shipments.filter((s) => s.statusCode !== 'DELIVERED' && !s.pod).length,
      delivered: shipments.filter((s) => s.statusCode === 'DELIVERED' || s.pod).length,
    };
  }, [shipments]);

  if (isLoading) return <Loader label="Loading dashboard..." />;

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4 md:p-0">
      <div>
        <h1 className="text-xl font-black text-slate-800">Welcome, {currentUser?.name}</h1>
        <p className="text-sm text-slate-500">Domestic operations overview.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <SummaryTile label="My Tasks" value={myTaskCount} to="/operations/domestic/tasks" />
        <SummaryTile label="Export Shipments" value={stats.total} to="/operations/domestic/shipment-history" />
        <SummaryTile label="Pending Pickups" value={stats.pendingPickup} to="/operations/domestic/pickups" />
        <SummaryTile label="Pending Delivery" value={stats.pendingDelivery} to="/operations/domestic/delivery-status" />
        <SummaryTile label="Delivered" value={stats.delivered} to="/operations/domestic/pod" />
        <SummaryTile label="Generate AWB" value="+" to="/operations/domestic/awb" />
        <SummaryTile label="Track Shipment" value="→" to="/operations/domestic/tracking" />
      </div>
    </div>
  );
};

export default DomesticAdminDashboard;