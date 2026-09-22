// src/Pages/modules/operations/pages/Client/ShipmentHistory.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import SectionCard from '../../components/SectionCard';
import Loader from '../../../../../Components/Shared/Loader';
import WaitingForBadge from '../../components/WaitingForBadge';
import { useOperationsAuth } from '../../hooks/useOperationsAuth';
import { fetchShipmentsByClientEmail } from '../../services/shipmentService';

const STATUS_TONE = (label = '') => {
  const l = label.toLowerCase();
  if (l.includes('delivered')) return 'bg-emerald-50 text-emerald-700';
  if (l.includes('customs') || l.includes('exception')) return 'bg-red-50 text-red-600';
  return 'bg-amber-50 text-amber-700';
};

const ShipmentHistory = () => {
  const { currentUser } = useOperationsAuth();
  const [shipments, setShipments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [modeFilter, setModeFilter] = useState('ALL');

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      setShipments(await fetchShipmentsByClientEmail(currentUser?.email));
    } catch {
      setLoadError('Failed to load your shipment history.');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (modeFilter === 'ALL') return shipments;
    return shipments.filter((s) => s.shipmentMode === modeFilter);
  }, [shipments, modeFilter]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-4 md:p-0">
      <div>
        <h1 className="text-xl font-black text-slate-800">Shipment History</h1>
        <p className="text-sm text-slate-500">Complete record of every shipment booked under your account.</p>
      </div>

      <SectionCard
        title="Your Shipments"
        actions={
          <select value={modeFilter} onChange={(e) => setModeFilter(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs bg-slate-50 focus:border-emerald-500 outline-none">
            <option value="ALL">All Modes</option>
            <option value="IMPORT">Import</option>
            <option value="EXPORT">Export</option>
          </select>
        }
      >
        {isLoading ? (
          <Loader label="Loading history..." />
        ) : loadError ? (
          <p className="text-sm text-red-600 font-semibold">{loadError}</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-slate-400">No shipment history found yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100">
                  <th className="py-2 pr-4">Booking Date</th>
                  <th className="py-2 pr-4">AWB / CN</th>
                  <th className="py-2 pr-4">Mode</th>
                  <th className="py-2 pr-4">Contents</th>
                  <th className="py-2 pr-4">Weight (KG)</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Currently Waiting On</th>
                  <th className="py-2">Details</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-b border-slate-50 last:border-b-0">
                    <td className="py-3 pr-4 text-slate-600">{s.bookingDate}</td>
                    <td className="py-3 pr-4 font-bold text-slate-700">{s.awbNumber}</td>
                    <td className="py-3 pr-4 text-slate-600">{s.shipmentMode}</td>
                    <td className="py-3 pr-4 text-slate-600">{s.parcel?.shipmentContents}</td>
                    <td className="py-3 pr-4 text-slate-600">{s.parcel?.weightKg}</td>
                    <td className="py-3 pr-4">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${STATUS_TONE(s.statusLabel)}`}>{s.statusLabel}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <WaitingForBadge mode={s.shipmentMode} statusCode={s.statusCode} exceptionCode={s.exceptionCode} />
                    </td>
                    <td className="py-3">
                      <Link to={`/operations/documents/awb/${encodeURIComponent(s.awbNumber)}`} className="text-xs font-bold text-emerald-600 hover:underline">
                        View 
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