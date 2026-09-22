// src/Pages/modules/operations/pages/OperationsHead/ManifestGenerate.jsx
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import SectionCard from '../../components/SectionCard';
import Loader from '../../../../../Components/Shared/Loader';
import { useToast } from '../../../../../Components/hooks/useToast';
import { isRequired } from '../../../../../Components/utils/validators';
import { fetchShipments } from '../../services/shipmentService';
import { fetchManifests, createManifest } from '../../services/manifestService';

const ManifestGenerate = () => {
  const { showToast } = useToast();

  const [flightNo, setFlightNo] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [shipments, setShipments] = useState([]);
  const [manifests, setManifests] = useState([]);
  const [selectedAwbs, setSelectedAwbs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [shipmentRecords, manifestRecords] = await Promise.all([fetchShipments(), fetchManifests()]);
      setShipments(shipmentRecords);
      setManifests(manifestRecords);
    } catch {
      showToast('Failed to load shipments / manifests', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const toggleAwb = (awbNumber) =>
    setSelectedAwbs((prev) => (prev.includes(awbNumber) ? prev.filter((a) => a !== awbNumber) : [...prev, awbNumber]));

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!isRequired(flightNo)) return showToast('Flight No. is required', 'warning');
      if (selectedAwbs.length === 0) return showToast('Select at least one shipment', 'warning');

      setIsSubmitting(true);
      try {
        await createManifest({ flightNo, departureDate, origin, destination, awbNumbers: selectedAwbs });
        showToast(`Manifest created for flight ${flightNo.trim()}`);
        setFlightNo('');
        setDepartureDate('');
        setOrigin('');
        setDestination('');
        setSelectedAwbs([]);
        await load();
      } catch (err) {
        showToast(err?.message || 'Failed to generate manifest', 'error');
      } finally {
        setIsSubmitting(false);
      }
    },
    [flightNo, departureDate, origin, destination, selectedAwbs, showToast, load]
  );

  if (isLoading) return <Loader label="Loading shipments..." />;

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4 md:p-0">
      <div>
        <h1 className="text-xl font-black text-slate-800">Manifest Generate</h1>
        <p className="text-sm text-slate-500">Select shipments and generate a manifest for airline handover.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <SectionCard title="Flight / Manifest Info">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Flight No.</label>
              <input disabled={isSubmitting} value={flightNo} onChange={(e) => setFlightNo(e.target.value)} maxLength={20} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-50 focus:border-emerald-500 outline-none disabled:opacity-60" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Departure Date</label>
              <input type="date" disabled={isSubmitting} value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-50 focus:border-emerald-500 outline-none disabled:opacity-60" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Origin</label>
              <input disabled={isSubmitting} value={origin} onChange={(e) => setOrigin(e.target.value)} maxLength={100} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-50 focus:border-emerald-500 outline-none disabled:opacity-60" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Destination</label>
              <input disabled={isSubmitting} value={destination} onChange={(e) => setDestination(e.target.value)} maxLength={100} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-50 focus:border-emerald-500 outline-none disabled:opacity-60" />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Select Shipments">
          {shipments.length === 0 ? (
            <p className="text-sm text-slate-400">No shipments available yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100">
                    <th className="py-2 pr-4"></th>
                    <th className="py-2 pr-4">AWB / CN</th>
                    <th className="py-2 pr-4">Mode</th>
                    <th className="py-2 pr-4">Receiver</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {shipments.map((s) => (
                    <tr key={s.id} className="border-b border-slate-50 last:border-b-0">
                      <td className="py-3 pr-4">
                        <input
                          type="checkbox"
                          disabled={isSubmitting}
                          checked={selectedAwbs.includes(s.awbNumber)}
                          onChange={() => toggleAwb(s.awbNumber)}
                          className="accent-emerald-600"
                        />
                      </td>
                      <td className="py-3 pr-4 font-bold text-slate-700">{s.awbNumber}</td>
                      <td className="py-3 pr-4 text-slate-600">{s.shipmentMode}</td>
                      <td className="py-3 pr-4 text-slate-600">{s.receiver?.companyName}</td>
                      <td className="py-3 text-slate-600">{s.statusLabel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-emerald-600 text-white font-bold px-6 py-3 rounded-lg shadow-md hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Generating...' : 'Generate Manifest'}
          </button>
        </div>
      </form>

      <SectionCard title="Existing Manifests">
        {manifests.length === 0 ? (
          <p className="text-sm text-slate-400">No manifests generated yet.</p>
        ) : (
          <div className="space-y-3">
            {manifests.map((m) => (
              <div key={m.id} className="border border-slate-100 rounded-lg p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-700">{m.flightNo} — {m.origin || '—'} → {m.destination || '—'}</p>
                  <p className="text-xs text-slate-400">{m.awbNumbers.length} shipment(s): {m.awbNumbers.join(', ')}</p>
                </div>
                <Link
                  to={`/operations/documents/manifest/${m.id}`}
                  className="shrink-0 text-xs font-bold bg-emerald-600 text-white px-3 py-2 rounded-lg hover:bg-emerald-700 transition"
                >
                  View
                </Link>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
};

export default ManifestGenerate;