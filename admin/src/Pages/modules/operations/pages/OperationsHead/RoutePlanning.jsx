// src/Pages/modules/operations/pages/OperationsHead/RoutePlanning.jsx
import { useState, useEffect, useCallback } from 'react';
import SectionCard from '../../components/SectionCard';
import Loader from '../../../../../Components/Shared/Loader';
import { useToast } from '../../../../../Components/hooks/useToast';
import { fetchRoutes, createRoute } from '../../services/routeService';
import { isRequired } from '../../../../../Components/utils/validators';

// A "lane" is drawn as a horizontal road: each waypoint (origin, any hubs
// implied by the lane text, destination) is a stop marked with the company
// logo, connected by a dashed road line.
const RoadLane = ({ route }) => {
  const stops = route.lane.split('→').map((s) => s.trim());
  return (
    <div className="border border-slate-200 rounded-xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p className="text-sm font-black text-slate-800">{route.lane}</p>
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${route.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
          {route.status}
        </span>
      </div>
      <div className="relative flex items-center overflow-x-auto py-3">
        <div className="absolute left-4 right-4 top-1/2 h-0.5 border-t-2 border-dashed border-slate-300 -translate-y-1/2" />
        <div className="relative flex items-center gap-10 sm:gap-16 px-4 min-w-max">
          {stops.map((stop, idx) => (
            <div key={idx} className="flex flex-col items-center gap-1.5 shrink-0">
              <div className="w-9 h-9 rounded-full bg-white border-2 border-emerald-600 shadow-sm flex items-center justify-center overflow-hidden">
                <img src="/log.jpeg" alt="MILEX" className="w-6 h-6 object-contain rounded-full" />
              </div>
              <p className="text-[10px] font-bold text-slate-600 text-center max-w-[90px]">{stop}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500 mt-2">
        <p><span className="font-bold text-slate-700">Mode:</span> {route.mode}</p>
        <p><span className="font-bold text-slate-700">Carrier:</span> {route.carrier}</p>
        <p><span className="font-bold text-slate-700">Avg Transit:</span> {route.avgTransitDays} days</p>
      </div>
    </div>
  );
};

const RoutePlanning = () => {
  const { showToast } = useToast();
  const [routes, setRoutes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lane, setLane] = useState('');
  const [mode, setMode] = useState('Air');
  const [carrier, setCarrier] = useState('');
  const [avgTransitDays, setAvgTransitDays] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setRoutes(await fetchRoutes());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!isRequired(lane)) return showToast('Lane is required', 'warning');
      if (!isRequired(carrier)) return showToast('Carrier is required', 'warning');

      setIsSubmitting(true);
      try {
        await createRoute({ lane, mode, carrier, avgTransitDays });
        showToast('Route added successfully');
        setLane('');
        setCarrier('');
        setAvgTransitDays('');
        await load();
      } catch (err) {
        showToast(err?.message || 'Failed to save route', 'error');
      } finally {
        setIsSubmitting(false);
      }
    },
    [lane, mode, carrier, avgTransitDays, showToast, load]
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4 md:p-0">
      <div>
        <h1 className="text-xl font-black text-slate-800">Route Planning</h1>
        <p className="text-sm text-slate-500">Manage active lanes and carrier options.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <SectionCard title="Add a Route / Lane">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Lane (use → between stops)</label>
              <input disabled={isSubmitting} value={lane} onChange={(e) => setLane(e.target.value)} maxLength={150} placeholder="Dhaka (DAC) → Dubai (DXB) → New York (JFK)" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-50 focus:border-emerald-500 outline-none disabled:opacity-60" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mode</label>
              <select disabled={isSubmitting} value={mode} onChange={(e) => setMode(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-50 focus:border-emerald-500 outline-none disabled:opacity-60">
                <option>Air</option>
                <option>Sea</option>
                <option>Road</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Avg Transit (Days)</label>
              <input type="number" min="0" disabled={isSubmitting} value={avgTransitDays} onChange={(e) => setAvgTransitDays(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-50 focus:border-emerald-500 outline-none disabled:opacity-60" />
            </div>
            <div className="sm:col-span-4">
              <label className="block text-xs font-bold text-slate-700 mb-1">Preferred Carrier</label>
              <input disabled={isSubmitting} value={carrier} onChange={(e) => setCarrier(e.target.value)} maxLength={100} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-50 focus:border-emerald-500 outline-none disabled:opacity-60" />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button type="submit" disabled={isSubmitting} className="bg-emerald-600 text-white font-bold px-6 py-3 rounded-lg shadow-md hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
              {isSubmitting ? 'Saving...' : 'Save Route'}
            </button>
          </div>
        </SectionCard>
      </form>

      <div className="space-y-4">
        {isLoading ? (
          <Loader label="Loading routes..." />
        ) : routes.length === 0 ? (
          <p className="text-sm text-slate-400">No active lanes yet.</p>
        ) : (
          routes.map((r) => <RoadLane key={r.id} route={r} />)
        )}
      </div>
    </div>
  );
};

export default RoutePlanning;