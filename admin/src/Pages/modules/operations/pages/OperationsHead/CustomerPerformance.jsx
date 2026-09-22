// src/Pages/modules/operations/pages/OperationsHead/CustomerPerformance.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import SectionCard from '../../components/SectionCard';
import Loader from '../../../../../Components/Shared/Loader';
import { fetchShipments } from '../../services/shipmentService';

const CustomerPerformance = () => {
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

  const rows = useMemo(() => {
    const grouped = new Map();
    shipments.forEach((s) => {
      const key = s.receiver?.companyName || s.pickup?.companyName || 'Unknown';
      if (!grouped.has(key)) grouped.set(key, { customer: key, total: 0, delivered: 0, exceptions: 0 });
      const entry = grouped.get(key);
      entry.total += 1;
      if (s.statusCode === 'DELIVERED' || s.pod) entry.delivered += 1;
      if (s.exceptionCode) entry.exceptions += 1;
    });
    return Array.from(grouped.values()).sort((a, b) => b.total - a.total);
  }, [shipments]);

  if (isLoading) return <Loader label="Loading customer performance..." />;

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4 md:p-0">
      <div>
        <h1 className="text-xl font-black text-slate-800">Customer Performance</h1>
        <p className="text-sm text-slate-500">Shipment volume and delivery reliability by customer.</p>
      </div>

      {loadError ? (
        <p className="text-sm text-red-600 font-semibold">{loadError}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-400">No customer shipment data available yet.</p>
      ) : (
        <SectionCard title="By Customer">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100">
                  <th className="py-2 pr-4">Customer</th>
                  <th className="py-2 pr-4">Total Shipments</th>
                  <th className="py-2 pr-4">Delivered</th>
                  <th className="py-2">Exceptions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.customer} className="border-b border-slate-50 last:border-b-0">
                    <td className="py-3 pr-4 font-bold text-slate-700">{r.customer}</td>
                    <td className="py-3 pr-4 text-slate-600">{r.total}</td>
                    <td className="py-3 pr-4 text-slate-600">{r.delivered}</td>
                    <td className="py-3">
                      {r.exceptions > 0 ? (
                        <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-red-50 text-red-600">{r.exceptions}</span>
                      ) : (
                        <span className="text-slate-300">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </div>
  );
};

export default CustomerPerformance;