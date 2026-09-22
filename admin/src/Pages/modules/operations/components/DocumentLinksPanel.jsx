// src/Pages/modules/operations/components/DocumentLinksPanel.jsx
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { fetchInvoiceByAwb } from '../services/invoiceService';
import { findManifestByAwb } from '../services/manifestService';

const DocRow = ({ label, ready, to }) => (
  <div className="flex items-center justify-between border border-slate-100 rounded-lg p-3 mb-2 last:mb-0">
    <div>
      <p className="text-sm font-semibold text-slate-700">{label}</p>
      <p className="text-[10px] text-slate-400">{ready ? 'Available' : 'Not generated yet'}</p>
    </div>
    {ready ? (
      <Link to={to} className="text-xs font-bold bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition shrink-0">
        View
      </Link>
    ) : (
      <span className="text-xs font-bold text-slate-300 shrink-0">—</span>
    )}
  </div>
);

const DocumentLinksPanel = ({ shipment }) => {
  const [invoiceExists, setInvoiceExists] = useState(false);
  const [manifestId, setManifestId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setIsLoading(true);
      try {
        const [invoice, manifest] = await Promise.all([
          fetchInvoiceByAwb(shipment.awbNumber),
          findManifestByAwb(shipment.awbNumber),
        ]);
        if (!active) return;
        setInvoiceExists(!!invoice);
        setManifestId(manifest?.id ?? null);
      } finally {
        if (active) setIsLoading(false);
      }
    };
    if (shipment?.awbNumber) load();
    return () => { active = false; };
  }, [shipment?.awbNumber]);

  if (!shipment) return null;

  return (
    <div>
      <DocRow label="Air Waybill" ready to={`/operations/documents/awb/${encodeURIComponent(shipment.awbNumber)}`} />
      <DocRow label="Shipping Label" ready to={`/operations/documents/label/${encodeURIComponent(shipment.awbNumber)}`} />
      <DocRow label="Commercial Invoice" ready={invoiceExists} to={`/operations/documents/invoice/${encodeURIComponent(shipment.awbNumber)}`} />
      <DocRow label="Proof of Delivery" ready={!!shipment.pod} to={`/operations/documents/pod/${encodeURIComponent(shipment.awbNumber)}`} />
      <DocRow label="Manifest" ready={!isLoading && !!manifestId} to={`/operations/documents/manifest/${manifestId}`} />
    </div>
  );
};

export default DocumentLinksPanel;