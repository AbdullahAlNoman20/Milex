// src/Pages/modules/operations/pages/Documents/PodPrintView.jsx
import { useParams } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import PrintShell from '../../components/PrintShell';
import Loader from '../../../../../Components/Shared/Loader';
import { fetchShipmentByAwb } from '../../services/shipmentService';

const PodPrintView = () => {
  const { awbNumber } = useParams();
  const [shipment, setShipment] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const found = await fetchShipmentByAwb(awbNumber);
      if (!found) setLoadError('Shipment not found for this AWB / CN number.');
      else if (!found.pod) setLoadError('No Proof of Delivery has been recorded for this shipment yet.');
      setShipment(found);
    } catch {
      setLoadError('Failed to load Proof of Delivery.');
    } finally {
      setIsLoading(false);
    }
  }, [awbNumber]);

  useEffect(() => { load(); }, [load]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader label="Loading Proof of Delivery..." />
      </div>
    );
  }

  const pod = shipment?.pod;

  return (
    <PrintShell title="Proof of Delivery" fileName={`POD-${awbNumber}`}>
      {loadError ? (
        <p className="text-sm text-red-600 font-semibold">{loadError}</p>
      ) : (
        <div className="text-sm">
          <p className="mb-1">{new Date(pod.deliveryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
          <p className="mb-1">Dear Customer,</p>
          <p className="mb-4">
            This is a proof of delivery / statement of final status for the shipment with AWB number{' '}
            <span className="font-bold">{shipment.awbNumber}</span>. Thank you for choosing MILEX Air.
          </p>

          <div className="bg-amber-50 border border-amber-200 text-amber-800 font-bold px-4 py-3 rounded mb-4 text-sm">
            Your shipment {shipment.awbNumber} was delivered on{' '}
            {new Date(pod.deliveryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 border-t border-b border-slate-200 py-4 mb-4">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Signed</p>
              <p className="font-semibold text-slate-800">{pod.receivedBy}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Destination</p>
              <p className="font-semibold text-slate-800">{shipment.receiver?.city}, {shipment.receiver?.country}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Signature</p>
              <p className="italic text-lg text-slate-700" style={{ fontFamily: 'cursive' }}>{pod.signatureText || pod.receivedBy}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Shipment Status</p>
              <p className="font-semibold text-emerald-700">Delivered</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">AWB / CN Number</p>
              <p className="font-semibold text-slate-800">{shipment.awbNumber}</p>
            </div>
          </div>

          <p className="font-bold text-xs uppercase text-slate-500 mb-2">Additional Shipment Details</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
            <p><span className="font-bold text-slate-600">Service:</span> {(shipment.services || []).join(', ') || 'Standard'}</p>
            <p><span className="font-bold text-slate-600">Origin:</span> {shipment.pickup?.city}, {shipment.pickup?.country}</p>
            <p><span className="font-bold text-slate-600">Contents:</span> {shipment.parcel?.shipmentContents}</p>
            <p><span className="font-bold text-slate-600">Remarks:</span> {pod.remarks || '—'}</p>
          </div>
        </div>
      )}
    </PrintShell>
  );
};

export default PodPrintView;