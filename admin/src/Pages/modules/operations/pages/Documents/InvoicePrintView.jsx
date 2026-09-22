// src/Pages/modules/operations/pages/Documents/InvoicePrintView.jsx
import { useParams } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import PrintShell from '../../components/PrintShell';
import Loader from '../../../../../Components/Shared/Loader';
import { fetchInvoiceByAwb } from '../../services/invoiceService';

const InvoicePrintView = () => {
  const { awbNumber } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const found = await fetchInvoiceByAwb(awbNumber);
      if (!found) setLoadError('No invoice found for this AWB number.');
      setInvoice(found);
    } catch {
      setLoadError('Failed to load invoice.');
    } finally {
      setIsLoading(false);
    }
  }, [awbNumber]);

  useEffect(() => { load(); }, [load]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader label="Loading invoice..." />
      </div>
    );
  }

  return (
    <PrintShell title="Commercial Invoice" fileName={`Invoice-${awbNumber}`}>
      {loadError ? (
        <p className="text-sm text-red-600 font-semibold">{loadError}</p>
      ) : (
        <div className="text-xs border border-slate-800">
          <div className="grid grid-cols-1 sm:grid-cols-2 border-b border-slate-800">
            <div className="border-r border-slate-800 p-2">
              <p className="font-bold mb-1">SHIPPER INFORMATION</p>
              <p>Company: {invoice.shipper?.companyName}</p>
              <p>Attn: {invoice.shipper?.contactPerson}</p>
              <p>Address: {invoice.shipper?.address}</p>
              <p>City: {invoice.shipper?.city}</p>
              <p>Post Code: {invoice.shipper?.postCode}</p>
              <p>Country: {invoice.shipper?.country}</p>
              <p>Phone: {invoice.shipper?.contactPhone}</p>
              <p>Email: {invoice.shipper?.contactEmail}</p>
            </div>
            <div className="p-2">
              <p className="font-bold mb-1">INVOICE</p>
              <p>Invoice Number: <b>INV-{invoice.awbNumber}</b></p>
              <p>AWB Number: <b>{invoice.awbNumber}</b></p>
              <p>Invoice Date: <b>{invoice.invoiceDate}</b></p>
              <p className="font-bold mt-3 mb-1">CONSIGNEE INFORMATION</p>
              <p>Company: {invoice.consignee?.companyName}</p>
              <p>Attn: {invoice.consignee?.contactPerson}</p>
              <p>Address: {invoice.consignee?.address}</p>
              <p>City: {invoice.consignee?.city}</p>
              <p>Country: {invoice.consignee?.country}</p>
              <p>BIN Number: {invoice.binNumber}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
          <table className="w-full min-w-[500px]">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-50">
                <th className="p-1.5 text-left w-10">SL</th>
                <th className="p-1.5 text-left">Description</th>
                <th className="p-1.5 text-center">HS Code</th>
                <th className="p-1.5 text-center">PCS</th>
                <th className="p-1.5 text-center">Unit Cost</th>
                <th className="p-1.5 text-right">Value</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((it, idx) => (
                <tr key={idx} className="border-b border-slate-200">
                  <td className="p-1.5">{idx + 1}</td>
                  <td className="p-1.5">{it.description}</td>
                  <td className="p-1.5 text-center">{it.hsCode}</td>
                  <td className="p-1.5 text-center">{it.pcs}</td>
                  <td className="p-1.5 text-center">{Number(it.unitCost || 0).toFixed(2)}</td>
                  <td className="p-1.5 text-right">{(Number(it.unitCost || 0) * Number(it.pcs || 0)).toFixed(2)}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={5} className="p-1.5 text-right font-bold">TOTAL:</td>
                <td className="p-1.5 text-right font-bold">{invoice.total.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
          </div>

          <div className="p-2 border-t border-slate-800">
            <p className="font-bold">Additional Comment:</p>
            <p className="text-slate-500 min-h-[16px]">{invoice.additionalComment || '—'}</p>
            <p className="mt-2 italic text-slate-500">
              I/we hereby certify that the information contained in this invoice is true and correct
              and that the contents of the shipment are as stated above.
            </p>
            <p className="mt-8 border-t border-slate-800 w-48 pt-1">Shipper Signature</p>
          </div>
        </div>
      )}
    </PrintShell>
  );
};

export default InvoicePrintView;