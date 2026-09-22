// src/Pages/modules/operations/pages/OperationsHead/BookingSummaryOverview.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import SectionCard from '../../components/SectionCard';
import Loader from '../../../../../Components/Shared/Loader';
import WaitingForBadge from '../../components/WaitingForBadge';
import { fetchShipments } from '../../services/shipmentService';

const BookingSummaryOverview = () => {
  const [shipments, setShipments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modeFilter, setModeFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

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
    let rows = shipments;
    if (modeFilter !== 'ALL') rows = rows.filter((s) => s.shipmentMode === modeFilter);
    const term = searchTerm.trim().toLowerCase();
    if (term) rows = rows.filter((s) => s.awbNumber.toLowerCase().includes(term) || s.receiver?.companyName?.toLowerCase().includes(term));
    return rows;
  }, [shipments, modeFilter, searchTerm]);

  const totals = useMemo(() => ({
    count: filtered.length,
    weight: filtered.reduce((sum, s) => sum + (Number(s.parcel?.weightKg) || 0), 0),
  }), [filtered]);

  if (isLoading) return <Loader label="Loading bookings..." />;

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4 md:p-0">
      <div>
        <h1 className="text-xl font-black text-slate-800">Booking Summary</h1>
        <p className="text-sm text-slate-500">All bookings across every customer and shipment mode.</p>
      </div>

      <SectionCard
        title={`Bookings (${totals.count}) — Total Weight ${totals.weight.toFixed(1)} kg`}
        actions={
          <div className="flex gap-2">
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search AWB / customer" maxLength={50} className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs bg-slate-50 focus:border-emerald-500 outline-none" />
            <select value={modeFilter} onChange={(e) => setModeFilter(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs bg-slate-50 focus:border-emerald-500 outline-none">
              <option value="ALL">All Modes</option>
              <option value="IMPORT">Import</option>
              <option value="EXPORT">Export</option>
            </select>
          </div>
        }
      >
        {filtered.length === 0 ? (
          <p className="text-sm text-slate-400">No bookings match your filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100">
                  <th className="py-2 pr-4">Booking Date</th>
                  <th className="py-2 pr-4">AWB / CN</th>
                  <th className="py-2 pr-4">Mode</th>
                  <th className="py-2 pr-4">Sender</th>
                  <th className="py-2 pr-4">Receiver</th>
                  <th className="py-2 pr-4">Weight (KG)</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Currently Waiting On</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-b border-slate-50 last:border-b-0">
                    <td className="py-3 pr-4 text-slate-600">{s.bookingDate}</td>
                    <td className="py-3 pr-4">
                      <Link to={`/operations/documents/awb/${encodeURIComponent(s.awbNumber)}`} className="font-bold text-emerald-600 hover:underline">
                        {s.awbNumber}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-slate-600">{s.shipmentMode}</td>
                    <td className="py-3 pr-4 text-slate-600">{s.pickup?.companyName}</td>
                    <td className="py-3 pr-4 text-slate-600">{s.receiver?.companyName}</td>
                    <td className="py-3 pr-4 text-slate-600">{s.parcel?.weightKg}</td>
                    <td className="py-3 pr-4 text-slate-600">{s.statusLabel}</td>
                    <td className="py-3 pr-4">
                      <WaitingForBadge mode={s.shipmentMode} statusCode={s.statusCode} exceptionCode={s.exceptionCode} />
                    </td>
                    <td className="py-3">
                      <Link to={`/operations/documents/awb/${encodeURIComponent(s.awbNumber)}`} className="text-xs font-bold bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition">
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

export default BookingSummaryOverview;