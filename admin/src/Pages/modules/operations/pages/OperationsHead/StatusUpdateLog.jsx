// src/Pages/modules/operations/pages/OperationsHead/StatusUpdateLog.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import SectionCard from '../../components/SectionCard';
import Loader from '../../../../../Components/Shared/Loader';
import { fetchStatusLogs } from '../../services/statusLogService';
import { getExceptionLabel } from '../../constants/shipmentStatus';

const formatDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
};

const StatusUpdateLog = () => {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      setLogs(await fetchStatusLogs());
    } catch {
      setLoadError('Failed to load status logs.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filteredLogs = useMemo(() => {
    const term = filter.trim().toLowerCase();
    if (!term) return logs;
    return logs.filter((l) => l.awbNumber.toLowerCase().includes(term));
  }, [logs, filter]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4 md:p-0">
      <div>
        <h1 className="text-xl font-black text-slate-800">Status Update Log</h1>
        <p className="text-sm text-slate-500">Full audit trail of shipment status changes.</p>
      </div>

      <SectionCard
        title="Recent Updates"
        actions={
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by AWB / CN"
            maxLength={30}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs bg-slate-50 focus:border-emerald-500 outline-none"
          />
        }
      >
        {isLoading ? (
          <Loader label="Loading logs..." />
        ) : loadError ? (
          <p className="text-sm text-red-600 font-semibold">{loadError}</p>
        ) : filteredLogs.length === 0 ? (
          <p className="text-sm text-slate-400">No status updates found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100">
                  <th className="py-2 pr-4">AWB / CN</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Exception</th>
                  <th className="py-2 pr-4">Updated By</th>
                  <th className="py-2">Updated At</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((l) => (
                  <tr key={l.id} className="border-b border-slate-50 last:border-b-0">
                    <td className="py-3 pr-4 font-bold text-slate-700">{l.awbNumber}</td>
                    <td className="py-3 pr-4 text-slate-600">{l.status}</td>
                    <td className="py-3 pr-4">
                      {l.exceptionCode ? (
                        <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-red-50 text-red-600">
                          {getExceptionLabel(l.exceptionCode)}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-slate-600">{l.updatedBy}</td>
                    <td className="py-3 text-slate-400 text-xs">{formatDate(l.updatedAt)}</td>
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

export default StatusUpdateLog;