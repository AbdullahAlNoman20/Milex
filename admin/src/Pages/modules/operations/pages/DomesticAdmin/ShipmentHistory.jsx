// src/Pages/modules/operations/pages/DomesticAdmin/ShipmentHistory.jsx
// (Approximate design — mirrored in ForeignAdmin/ShipmentHistory.jsx)
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import SectionCard from '../../components/SectionCard';
import Loader from '../../../../../Components/Shared/Loader';
import WaitingForBadge from '../../components/WaitingForBadge';
import { fetchShipments } from '../../services/shipmentService';

const ShipmentHistory = () => {
  const [shipments, setShipments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setShipments(await fetchShipments());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const term = filter.trim().toLowerCase();
    if (!term) return shipments;
    return shipments.filter((s) => s.awbNumber.toLowerCase().includes(term));
  }, [shipments, filter]);

  if (isLoading) return <Loader label="Loading shipment history..." />;

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-4 md:p-0">
      <div>
        <h1 className="text-xl font-black text-slate-800">Shipment History</h1>
        <p className="text-sm text-slate-500">All shipments booked through this module.</p>
      </div>
      <SectionCard
        title="All Shipments"
        actions={
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter by AWB" maxLength={30} className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs bg-slate-50 focus:border-emerald-500 outline-none" />
        }
      >
        {filtered.length === 0 ? (
          <p className="text-sm text-slate-400">No shipments found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100">
                  <th className="py-2 pr-4">AWB / CN</th>
                  <th className="py-2 pr-4">Mode</th>
                  <th className="py-2 pr-4">Receiver</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Currently Waiting On</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-b border-slate-50 last:border-b-0">
                    <td className="py-3 pr-4 font-bold text-slate-700">{s.awbNumber}</td>
                    <td className="py-3 pr-4 text-slate-600">{s.shipmentMode}</td>
                    <td className="py-3 pr-4 text-slate-600">{s.receiver?.companyName}</td>
                    <td className="py-3 pr-4 text-slate-600">{s.statusLabel}</td>
                    <td className="py-3 pr-4">
                      <WaitingForBadge mode={s.shipmentMode} statusCode={s.statusCode} exceptionCode={s.exceptionCode} />
                    </td>
                    <td className="py-3">
                      <Link to={`/operations/documents/awb/${encodeURIComponent(s.awbNumber)}`} className="text-xs font-bold text-emerald-600 hover:underline">
                        View AWB
                      </Link>
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

export default ShipmentHistory;