// src/Pages/modules/operations/pages/Client/ClientDashboard.jsx
import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useOperationsAuth } from '../../hooks/useOperationsAuth';
import { fetchClients } from '../../services/clientService';
import { fetchShipmentsByClientEmail } from '../../services/shipmentService';
import { fetchRequestsByClientEmail, REQUEST_STATUS } from '../../services/requestService';
import { DOCUMENT_CHECKLIST } from '../../constants/shipmentFields';
import Loader from '../../../../../Components/Shared/Loader';
import { humanizeStatus } from '../../../../../Components/utils/format';

const InfoRow = ({ label, value }) => (
  <div className="flex flex-col gap-0.5 py-2 border-b border-slate-100 last:border-b-0">
    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{label}</span>
    <span className="text-sm font-semibold text-slate-800 break-words">{value || '—'}</span>
  </div>
);

// Number-first summary tile — no icons, per Milex's dashboard spec.
const SummaryTile = ({ label, value, to }) => (
  <Link to={to} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:border-emerald-300 transition block">
    <p className="text-3xl font-black text-slate-800">{value}</p>
    <p className="text-xs font-bold text-slate-500 mt-1">{label}</p>
  </Link>
);

const ClientDashboard = () => {
  const { currentUser } = useOperationsAuth();
  const [client, setClient] = useState(null);
  const [shipments, setShipments] = useState([]);
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const [clients, shipmentRecords, requestRecords] = await Promise.all([
        fetchClients(),
        fetchShipmentsByClientEmail(currentUser?.email),
        fetchRequestsByClientEmail(currentUser?.email),
      ]);
      const matched =
        clients.find((c) => typeof c.email === 'string' && c.email.toLowerCase() === currentUser?.email?.toLowerCase()) ||
        clients[0] || null;
      setClient(matched);
      setShipments(shipmentRecords);
      setRequests(requestRecords);
    } catch {
      setLoadError('Failed to load your dashboard.');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { load(); }, [load]);

  if (isLoading) return <Loader label="Loading your dashboard..." />;
  if (loadError) return <p className="text-sm text-red-600 font-semibold p-6">{loadError}</p>;

  const inTransitCount = shipments.filter((s) => s.statusCode !== 'DELIVERED' && !s.pod).length;
  const pendingDocsCount = shipments.reduce(
    (sum, s) => sum + DOCUMENT_CHECKLIST.filter((d) => !(s.documents || []).includes(d)).length,
    0
  );
  const pendingImport = requests.filter((r) => r.mode === 'IMPORT' && r.status === REQUEST_STATUS.PENDING).length;
  const pendingExport = requests.filter((r) => r.mode === 'EXPORT' && r.status === REQUEST_STATUS.PENDING).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4 md:p-0">
      <div>
        <h1 className="text-xl font-black text-slate-800">Welcome, {currentUser?.name}</h1>
        <p className="text-sm text-slate-500">Your account overview and quick access to every page.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <SummaryTile label="Booking Summary" value={shipments.length} to="/operations/client/bookings" />
        <SummaryTile label="In Transit" value={inTransitCount} to="/operations/client/tracking" />
        <SummaryTile label="Documents Pending" value={pendingDocsCount} to="/operations/client/documents" />
        <SummaryTile label="Import Requests" value={pendingImport} to="/operations/client/import-request" />
        <SummaryTile label="Export Requests" value={pendingExport} to="/operations/client/export-request" />
        <SummaryTile label="My Requests" value={requests.length} to="/operations/client/my-requests" />
      </div>

      {client && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black text-slate-700 uppercase tracking-wide">Account Overview</h2>
            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">
              {humanizeStatus(client.status) || 'Active'}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
            <InfoRow label="Account Name" value={client.accountName} />
            <InfoRow label="Contact Person" value={client.contactPerson} />
            <InfoRow label="Mobile" value={client.mobile} />
            <InfoRow label="Email" value={client.email} />
            <InfoRow label="Business Type" value={client.businessType} />
            <InfoRow label="Account Type" value={client.accountType} />
            <InfoRow label="Credit Period" value={client.creditPeriodDays ? `${client.creditPeriodDays} Days` : null} />
            <InfoRow label="Address" value={client.address} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientDashboard;