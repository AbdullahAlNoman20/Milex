// src/Pages/modules/operations/pages/OperationsHead/HeadPickupRequest.jsx
import { useState, useEffect, useCallback } from 'react';
import SectionCard from '../../components/SectionCard';
import Loader from '../../../../../Components/Shared/Loader';
import { useToast } from '../../../../../Components/hooks/useToast';
import { useOperationsAuth } from '../../hooks/useOperationsAuth';
import { fetchShipments } from '../../services/shipmentService';
import { addLogEntry } from '../../services/statusLogService';

// Operations Head triggers a pickup request under a specific parcel. It
// doesn't move the status itself (Domestic/Foreign already see these
// shipments on their own Pickup Request pages by status), it logs an
// explicit instruction so the right admin knows to prioritize it.
const HeadPickupRequest = () => {
  const { currentUser } = useOperationsAuth();
  const { showToast } = useToast();
  const [shipments, setShipments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyAwb, setBusyAwb] = useState(null);
  const [notes, setNotes] = useState({});

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const all = await fetchShipments();
      setShipments(
        all.filter(
          (s) =>
            (s.shipmentMode === 'EXPORT' && s.statusCode === 'BOOKED') ||
            (s.shipmentMode === 'IMPORT' && s.statusCode === 'BOOKING_CONFIRMED')
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRequestPickup = async (s) => {
    const assignedRole = s.shipmentMode === 'EXPORT' ? 'Domestic Administrator' : 'Foreign Administrator';
    setBusyAwb(s.awbNumber);
    try {
      await addLogEntry({
        awbNumber: s.awbNumber,
        status: `Pickup Requested by Operations Head — Assigned to ${assignedRole}`,
        exceptionCode: null,
        note: notes[s.awbNumber] || '',
        updatedBy: currentUser?.name || 'Operations Head',
      });
      showToast(`Pickup request sent for ${s.awbNumber}`);
      setNotes((prev) => ({ ...prev, [s.awbNumber]: '' }));
    } catch (err) {
      showToast(err?.message || 'Failed to request pickup', 'error');
    } finally {
      setBusyAwb(null);
    }
  };

  if (isLoading) return <Loader label="Loading shipments awaiting pickup..." />;

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4 md:p-0">
      <div>
        <h1 className="text-xl font-black text-slate-800">Request Pickup</h1>
        <p className="text-sm text-slate-500">Trigger a pickup instruction for a specific parcel to the responsible administrator.</p>
      </div>

      <SectionCard title="Shipments Awaiting Pickup">
        {shipments.length === 0 ? (
          <p className="text-sm text-slate-400">No shipments are currently awaiting pickup.</p>
        ) : (
          <div className="space-y-3">
            {shipments.map((s) => (
              <div key={s.awbNumber} className="border border-slate-100 rounded-lg p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-slate-700">{s.awbNumber} — {s.shipmentMode}</p>
                    <p className="text-xs text-slate-500">
                      From: {s.pickup?.companyName}, {s.pickup?.city}, {s.pickup?.country}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-blue-600">
                    Will assign to {s.shipmentMode === 'EXPORT' ? 'Domestic Administrator' : 'Foreign Administrator'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    value={notes[s.awbNumber] || ''}
                    onChange={(e) => setNotes((prev) => ({ ...prev, [s.awbNumber]: e.target.value }))}
                    placeholder="Optional note for the admin..."
                    maxLength={300}
                    className="flex-1 border border-slate-300 rounded-lg p-2 text-xs bg-slate-50 focus:border-emerald-500 outline-none"
                  />
                  <button
                    type="button"
                    disabled={busyAwb === s.awbNumber}
                    onClick={() => handleRequestPickup(s)}
                    className="text-xs font-bold bg-emerald-600 text-white px-3 py-2 rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
                  >
                    {busyAwb === s.awbNumber ? 'Sending...' : 'Request Pickup'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
};

export default HeadPickupRequest;