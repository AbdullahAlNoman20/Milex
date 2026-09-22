// src/Pages/modules/operations/pages/Documents/ManifestPrintView.jsx
import { useParams, Link } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import PrintShell from '../../components/PrintShell';
import Loader from '../../../../../Components/Shared/Loader';
import { fetchManifests } from '../../services/manifestService';
import { fetchShipmentByAwb } from '../../services/shipmentService';

const ManifestPrintView = () => {
  const { manifestId } = useParams();
  const [manifest, setManifest] = useState(null);
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const manifests = await fetchManifests();
      const found = manifests.find((m) => String(m.id) === String(manifestId));
      if (!found) { setLoadError('Manifest not found.'); return; }
      setManifest(found);
      const shipments = await Promise.all(found.awbNumbers.map((awb) => fetchShipmentByAwb(awb)));
      setRows(shipments.filter(Boolean));
    } catch {
      setLoadError('Failed to load manifest.');
    } finally {
      setIsLoading(false);
    }
  }, [manifestId]);

  useEffect(() => { load(); }, [load]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader label="Loading manifest..." />
      </div>
    );
  }

  const totalPieces = rows.reduce((sum, r) => sum + (Number(r.parcel?.pieces) || 0), 0);
  const totalWeight = rows.reduce((sum, r) => sum + (Number(r.parcel?.weightKg) || 0), 0);
  const manifestNo = `MFN${String(manifest?.id ?? '').padStart(6, '0')}`;

  return (
    <PrintShell title="Driver's Manifest / Shipment Summary" fileName={`Manifest-${manifestId}`}>
      {loadError ? (
        <p className="text-sm text-red-600 font-semibold">{loadError}</p>
      ) : (
        <div className="text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-slate-200 pb-4 mb-4">
            <div>
              <p><span className="font-bold text-slate-600">Manifest Number:</span> {manifestNo}</p>
              <p><span className="font-bold text-slate-600">Flight Number:</span> {manifest.flightNo}</p>
              <p><span className="font-bold text-slate-600">Flight Departure Date:</span> {manifest.departureDate || '—'}</p>
            </div>
            <div>
              <p><span className="font-bold text-slate-600">Origin:</span> {manifest.origin || '—'}</p>
              <p><span className="font-bold text-slate-600">Destination:</span> {manifest.destination || '—'}</p>
              <p><span className="font-bold text-slate-600">Processing Facility:</span> MILEX Dhaka HUB</p>
            </div>
          </div>

          <p className="text-center font-black text-base tracking-widest mb-4">MFN # {manifestNo}</p>

          <table className="w-full border border-slate-800 mb-4">
            <thead>
              <tr className="bg-slate-800 text-white text-left">
                <th className="p-1.5">Product</th>
                <th className="p-1.5 text-right">Total Pieces</th>
                <th className="p-1.5 text-right">Weight (Kg)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-300">
                <td className="p-1.5">MILEX Air Cargo — {rows[0]?.shipmentMode || '—'}</td>
                <td className="p-1.5 text-right">{totalPieces}</td>
                <td className="p-1.5 text-right">{totalWeight}</td>
              </tr>
              <tr className="border-t border-slate-300 font-bold bg-slate-50">
                <td className="p-1.5">Total</td>
                <td className="p-1.5 text-right">{totalPieces}</td>
                <td className="p-1.5 text-right">{totalWeight}</td>
              </tr>
            </tbody>
          </table>

          <p className="font-bold text-xs uppercase text-slate-500 mb-2">Shipments on this Manifest</p>
          <div className="overflow-x-auto mb-6">
            <table className="w-full min-w-[700px] border border-slate-800">
              <thead>
                <tr className="bg-slate-800 text-white text-left">
                  <th className="p-1.5">Sl.No</th>
                  <th className="p-1.5">AWB / CN</th>
                  <th className="p-1.5">Pcs</th>
                  <th className="p-1.5">Weight (Kg)</th>
                  <th className="p-1.5">Consignor</th>
                  <th className="p-1.5">Consignee</th>
                  <th className="p-1.5">Description</th>
                  <th className="p-1.5">Document</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={r.awbNumber} className="border-t border-slate-300">
                    <td className="p-1.5">{idx + 1}</td>
                    <td className="p-1.5 font-bold">{r.awbNumber}</td>
                    <td className="p-1.5">{r.parcel?.pieces}</td>
                    <td className="p-1.5">{r.parcel?.weightKg}</td>
                    <td className="p-1.5">{r.pickup?.companyName}</td>
                    <td className="p-1.5">{r.receiver?.companyName}</td>
                    <td className="p-1.5">{r.parcel?.shipmentContents}</td>
                    <td className="p-1.5 print:hidden">
                      <Link to={`/operations/documents/awb/${encodeURIComponent(r.awbNumber)}`} className="font-bold text-emerald-600 hover:underline">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-10">
            <p className="border-t border-slate-800 pt-1 text-slate-500">Shipper's Signature / Date</p>
            <p className="border-t border-slate-800 pt-1 text-slate-500">Receiving DC — Received / Date</p>
          </div>
        </div>
      )}
    </PrintShell>
  );
};

export default ManifestPrintView;