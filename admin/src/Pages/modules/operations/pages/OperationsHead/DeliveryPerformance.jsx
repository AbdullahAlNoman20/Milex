import { useState, useEffect, useCallback, useMemo } from 'react';
import SectionCard from '../../components/SectionCard';
import Loader from '../../../../../Components/Shared/Loader';
import { fetchShipments } from '../../services/shipmentService';

const StatCard = ({ label, value, tone = 'default' }) => {
  const toneClasses = {
    default: 'text-slate-800',
    success: 'text-emerald-600',
    danger: 'text-red-600',
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-2xl font-black ${toneClasses[tone] || toneClasses.default}`}>{value}</p>
    </div>
  );
};

const DeliveryPerformance = () => {
  const [shipments, setShipments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      setShipments(await fetchShipments());
    } catch {
      setLoadError('Failed to load shipment data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const total = shipments.length;
    const delivered = shipments.filter((s) => s.statusCode === 'DELIVERED' || s.pod).length;
    const withException = shipments.filter((s) => s.exceptionCode).length;
    const inTransit = total - delivered - withException;
    const deliveryRate = total ? Math.round((delivered / total) * 100) : 0;
    return { total, delivered, withException, inTransit, deliveryRate };
  }, [shipments]);

  if (isLoading) return <Loader label="Loading delivery performance..." />;

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4 md:p-0">
      <div>
        <h1 className="text-xl font-black text-slate-800">Delivery Performance</h1>
        <p className="text-sm text-slate-500">Overall delivery metrics across all shipments.</p>
      </div>

      {loadError ? (
        <p className="text-sm text-red-600 font-semibold">{loadError}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Total Shipments" value={stats.total} />
            <StatCard label="Delivered" value={stats.delivered} tone="success" />
            <StatCard label="In Transit" value={Math.max(stats.inTransit, 0)} />
            <StatCard label="Exceptions" value={stats.withException} tone={stats.withException ? 'danger' : 'default'} />
          </div>

          <SectionCard title="On-Time Delivery Rate">
            <div className="flex items-center gap-4">
              <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-600" style={{ width: `${stats.deliveryRate}%` }} />
              </div>
              <span className="text-sm font-black text-slate-700">{stats.deliveryRate}%</span>
            </div>
          </SectionCard>

          <SectionCard title="Shipment Breakdown">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100">
                    <th className="py-2 pr-4">AWB / CN</th>
                    <th className="py-2 pr-4">Mode</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {shipments.map((s) => (
                    <tr key={s.id} className="border-b border-slate-50 last:border-b-0">
                      <td className="py-3 pr-4 font-bold text-slate-700">{s.awbNumber}</td>
                      <td className="py-3 pr-4 text-slate-600">{s.shipmentMode}</td>
                      <td className="py-3 text-slate-600">{s.statusLabel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
};

export default DeliveryPerformance;