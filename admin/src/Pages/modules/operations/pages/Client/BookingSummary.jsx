// src/Pages/modules/operations/pages/Client/BookingSummary.jsx
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import SectionCard from '../../components/SectionCard';
import Loader from '../../../../../Components/Shared/Loader';
import WaitingForBadge from '../../components/WaitingForBadge';
import { useOperationsAuth } from '../../hooks/useOperationsAuth';
import { fetchShipmentsByClientEmail } from '../../services/shipmentService';

const BookingSummary = () => {
  const { currentUser } = useOperationsAuth();
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      setBookings(await fetchShipmentsByClientEmail(currentUser?.email));
    } catch {
      setLoadError('Failed to load your bookings.');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-4 md:p-0">
      <div>
        <h1 className="text-xl font-black text-slate-800">Booking Summary</h1>
        <p className="text-sm text-slate-500">Overview of your shipment bookings. Click View Details for full documents.</p>
      </div>
      <SectionCard title="Your Bookings">
        {isLoading ? (
          <Loader label="Loading bookings..." />
        ) : loadError ? (
          <p className="text-sm text-red-600 font-semibold">{loadError}</p>
        ) : bookings.length === 0 ? (
          <p className="text-sm text-slate-400">No bookings found for your account yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100">
                  <th className="py-2 pr-4">Booking Date</th>
                  <th className="py-2 pr-4">Ref No</th>
                  <th className="py-2 pr-4">AWB / CN</th>
                  <th className="py-2 pr-4">Mode</th>
                  <th className="py-2 pr-4">Contents</th>
                  <th className="py-2 pr-4">Pieces</th>
                  <th className="py-2 pr-4">Weight (KG)</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Currently Waiting On</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className="border-b border-slate-50 last:border-b-0">
                    <td className="py-3 pr-4 text-slate-600">{b.bookingDate}</td>
                    <td className="py-3 pr-4 font-bold text-slate-700">{b.refNo}</td>
                    <td className="py-3 pr-4 text-slate-600">{b.awbNumber}</td>
                    <td className="py-3 pr-4 text-slate-600">{b.shipmentMode}</td>
                    <td className="py-3 pr-4 text-slate-600">{b.parcel?.shipmentContents}</td>
                    <td className="py-3 pr-4 text-slate-600">{b.parcel?.pieces}</td>                    <td className="py-3 pr-4 text-slate-600">{b.parcel?.weightKg}</td>
                    <td className="py-3 pr-4">
                      <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-amber-50 text-amber-700">{b.statusLabel}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <WaitingForBadge mode={b.shipmentMode} statusCode={b.statusCode} exceptionCode={b.exceptionCode} />
                    </td>
                    <td className="py-3">
                      <Link to={`/operations/documents/awb/${encodeURIComponent(b.awbNumber)}`} className="text-xs font-bold bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition">
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

export default BookingSummary;