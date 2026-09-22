// src/Pages/modules/operations/pages/ForeignAdmin/PickupRequestManagement.jsx
// Foreign Admin schedules pickups for approved IMPORT shipments (from overseas suppliers).
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import SectionCard from '../../components/SectionCard';
import Loader from '../../../../../Components/Shared/Loader';
import { useToast } from '../../../../../Components/hooks/useToast';
import { useOperationsAuth } from '../../hooks/useOperationsAuth';
import { fetchShipments, updateShipmentStatus } from '../../services/shipmentService';
import { todayLocalISO } from '../../../../../Components/utils/date';

const ForeignPickupRequestManagement = () => {
  const { currentUser } = useOperationsAuth();
  const { showToast } = useToast();
  const [shipments, setShipments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyAwb, setBusyAwb] = useState(null);
  const [dates, setDates] = useState({});

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const all = await fetchShipments();
      setShipments(all.filter((s) => s.shipmentMode === 'IMPORT' && s.statusCode === 'BOOKING_CONFIRMED'));
    } catch {
      showToast('Failed to load pickups', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const handleMarkPickedUp = useCallback(
    async (awb) => {
      const date = dates[awb] || todayLocalISO();
      setBusyAwb(awb);
      try {
        await updateShipmentStatus(awb, { statusCode: 'PICKED_UP', note: `Cargo collected from supplier on ${date}` }, currentUser?.name);
        showToast(`${awb} marked as picked up`);
        await load();
      } catch (err) {
        showToast(err?.message || 'Failed to update pickup', 'error');
      } finally {
        setBusyAwb(null);
      }
    },
    [dates, currentUser, showToast, load]
  );

  if (isLoading) return <Loader label="Loading pending pickups..." />;

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4 md:p-0">
      <div>
        <h1 className="text-xl font-black text-slate-800">Pickup Request Management</h1>
        <p className="text-sm text-slate-500">Import shipments booked and awaiting cargo collection from the overseas supplier.</p>
      </div>

      <SectionCard title="Pending Pickups">
        {shipments.length === 0 ? (
          <p className="text-sm text-slate-400">No pending pickups right now.</p>
        ) : (
          <div className="space-y-3">
            {shipments.map((s) => (
              <div key={s.awbNumber} className="border border-slate-100 rounded-lg p-3 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[200px]">
                  <Link to={`/operations/documents/awb/${encodeURIComponent(s.awbNumber)}`} className="text-sm font-bold text-emerald-600 hover:underline">
                    {s.awbNumber}
                  </Link>
                  <p className="text-xs text-slate-500">{s.pickup?.companyName} — {s.pickup?.address}, {s.pickup?.city}, {s.pickup?.country}</p>
                  <p className="text-xs text-slate-400">{s.parcel?.pieces} pcs · {s.parcel?.weightKg} kg</p>
                </div>
                <input
                  type="date"
                  value={dates[s.awbNumber] || todayLocalISO()}
                  onChange={(e) => setDates((prev) => ({ ...prev, [s.awbNumber]: e.target.value }))}
                  className="border border-slate-300 rounded-lg p-2 text-xs bg-slate-50 focus:border-emerald-500 outline-none"
                />
                <button
                  type="button"
                  disabled={busyAwb === s.awbNumber}
                  onClick={() => handleMarkPickedUp(s.awbNumber)}
                  className="text-xs font-bold bg-emerald-600 text-white px-3 py-2 rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {busyAwb === s.awbNumber ? 'Saving...' : 'Mark Picked Up'}
                </button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
};

export default ForeignPickupRequestManagement;