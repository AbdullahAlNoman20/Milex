// src/Pages/modules/operations/pages/Documents/AwbInvoiceCombinedView.jsx
// Single-print view combining AWB + Invoice, per the workflow doc: "On
// PRINT, system will generate AWB Label and Final Invoice for pickup READY."
import { useParams } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import PrintShell from '../../components/PrintShell';
import DocumentLinksPanel from '../../components/DocumentLinksPanel';
import Loader from '../../../../../Components/Shared/Loader';
import { fetchShipmentByAwb } from '../../services/shipmentService';
import { fetchInvoiceByAwb } from '../../services/invoiceService';

const Checkbox = ({ label, checked }) => (
  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 mr-5">
    <span className={`w-3.5 h-3.5 border border-slate-700 inline-flex items-center justify-center shrink-0 ${checked ? 'bg-emerald-600' : ''}`}>
      {checked && <span className="text-white text-[9px] leading-none">✓</span>}
    </span>
    {label}
  </span>
);

const AwbInvoiceCombinedView = () => {
  const { awbNumber } = useParams();
  const [shipment, setShipment] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const found = await fetchShipmentByAwb(awbNumber);
      if (!found) { setLoadError('Shipment not found for this AWB / CN number.'); return; }
      setShipment(found);
      setInvoice(await fetchInvoiceByAwb(awbNumber));
    } catch {
      setLoadError('Failed to load documents.');
    } finally {
      setIsLoading(false);
    }
  }, [awbNumber]);

  useEffect(() => { load(); }, [load]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader label="Loading AWB and Invoice..." />
      </div>
    );
  }

  return (
    <PrintShell
      title="AWB Label & Final Invoice"
      fileName={`AWB-Invoice-${awbNumber}`}
      sidebar={!loadError && shipment ? <DocumentLinksPanel shipment={shipment} /> : null}
    >
      {loadError ? (
        <p className="text-sm text-red-600 font-semibold">{loadError}</p>
      ) : (
        <div className="text-xs space-y-8">
          {/* ── AWB SECTION ── */}
          <div>
            <p className="font-black text-sm mb-3 uppercase tracking-wide">International Air Waybill</p>
            <div className="flex justify-between items-center mb-3">
              <p className="font-bold">AWB No: <span className="text-emerald-700">{shipment.awbNumber}</span></p>
              <p className="font-bold">Date: {shipment.bookingDate}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 border border-slate-800">
              <div className="border-r border-slate-800">
                <p className="bg-slate-800 text-white text-[10px] font-bold px-2 py-1">SENDER</p>
                <div className="p-2 space-y-0.5">
                  <p className="font-bold">{shipment.pickup?.companyName}</p>
                  <p>{shipment.pickup?.address}, {shipment.pickup?.city}, {shipment.pickup?.country}</p>
                  <p>Phone: {shipment.pickup?.contactPhone}</p>
                </div>
              </div>
              <div>
                <p className="bg-slate-800 text-white text-[10px] font-bold px-2 py-1">RECIPIENT</p>
                <div className="p-2 space-y-0.5">
                  <p className="font-bold">{shipment.receiver?.companyName}</p>
                  <p>{shipment.receiver?.address}, {shipment.receiver?.city}, {shipment.receiver?.country}</p>
                  <p>Phone: {shipment.receiver?.contactPhone}</p>
                </div>
              </div>
            </div>
            <div className="border border-t-0 border-slate-800 p-2">
              <Checkbox label="Document" checked={shipment.shipmentType === 'DOCUMENT'} />
              <Checkbox label="Non-Document" checked={shipment.shipmentType === 'NON_DOCUMENT'} />
              <span>Pieces: <b>{shipment.parcel?.pieces}</b> · Weight: <b>{shipment.parcel?.weightKg} kg</b></span>
            </div>
          </div>

          <div className="border-t-2 border-dashed border-slate-300" />

          {/* ── INVOICE SECTION ── */}
          <div>
            <p className="font-black text-sm mb-3 uppercase tracking-wide">Commercial Invoice</p>
            {!invoice ? (
              <p className="text-slate-400">No invoice generated for this AWB yet.</p>
            ) : (
              <>
                <div className="flex justify-between mb-2">
                  <p>Invoice Number: <b>INV-{invoice.awbNumber}</b></p>
                  <p>Invoice Date: <b>{invoice.invoiceDate}</b></p>
                </div>
                <table className="w-full border border-slate-800">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-50 text-left">
                      <th className="p-1.5">Description</th>
                      <th className="p-1.5 text-center">HS Code</th>
                      <th className="p-1.5 text-center">PCS</th>
                      <th className="p-1.5 text-center">Unit Cost</th>
                      <th className="p-1.5 text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((it, idx) => (
                      <tr key={idx} className="border-b border-slate-200">
                        <td className="p-1.5">{it.description}</td>
                        <td className="p-1.5 text-center">{it.hsCode || '—'}</td>
                        <td className="p-1.5 text-center">{it.pcs}</td>
                        <td className="p-1.5 text-center">{Number(it.unitCost || 0).toFixed(2)}</td>
                        <td className="p-1.5 text-right">{(Number(it.unitCost || 0) * Number(it.pcs || 0)).toFixed(2)}</td>
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={4} className="p-1.5 text-right font-bold">TOTAL:</td>
                      <td className="p-1.5 text-right font-bold">{invoice.total.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>
      )}
    </PrintShell>
  );
};

export default AwbInvoiceCombinedView;