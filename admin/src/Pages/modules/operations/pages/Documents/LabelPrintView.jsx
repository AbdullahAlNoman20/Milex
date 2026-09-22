// src/Pages/modules/operations/pages/Documents/LabelPrintView.jsx
import { useParams } from 'react-router-dom';
import { useEffect, useState, useRef, useCallback } from 'react';
import JsBarcode from 'jsbarcode';
import PrintShell from '../../components/PrintShell';
import Loader from '../../../../../Components/Shared/Loader';
import { fetchShipmentByAwb } from '../../services/shipmentService';

const LabelPrintView = () => {
  const { awbNumber } = useParams();
  const [shipment, setShipment] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const barcodeRef = useRef(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const found = await fetchShipmentByAwb(awbNumber);
      if (!found) setLoadError('Shipment not found for this AWB / CN number.');
      setShipment(found);
    } catch {
      setLoadError('Failed to load shipment.');
    } finally {
      setIsLoading(false);
    }
  }, [awbNumber]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (shipment && barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, shipment.awbNumber, {
          format: 'CODE128',
          width: 2,
          height: 50,
          displayValue: false,
          margin: 0,
        });
      } catch {
        /* invalid characters for barcode symbology — silently skip render */
      }
    }
  }, [shipment]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader label="Loading label..." />
      </div>
    );
  }

  return (
    <PrintShell title="Shipping Label" fileName={`Label-${awbNumber}`}>
      {loadError ? (
        <p className="text-sm text-red-600 font-semibold">{loadError}</p>
      ) : (
        <div className="border-4 border-slate-900 max-w-md mx-auto">
          <div className="flex justify-between items-center border-b-4 border-slate-900 p-2">
            <p className="text-lg font-black">{shipment.parcel?.weightKg} KG</p>
            <p className="text-lg font-black">1 OF 1</p>
          </div>
          <div className="p-3 border-b-4 border-slate-900">
            <p className="font-bold">{shipment.pickup?.companyName}</p>
            <p>{shipment.pickup?.contactPerson}</p>
            <p>{shipment.pickup?.address}</p>
            <p>{shipment.pickup?.city}, {shipment.pickup?.country}</p>
            <p className="mt-2 font-bold">SHIP TO:</p>
            <p className="font-black text-base">{shipment.receiver?.companyName}</p>
            <p>{shipment.receiver?.contactPerson}</p>
            <p>{shipment.receiver?.address}</p>
            <p className="font-black text-base uppercase">{shipment.receiver?.city} {shipment.receiver?.postCode}</p>
            <p className="font-black text-base uppercase">{shipment.receiver?.country}</p>
          </div>
          <div className="p-3 border-b-4 border-slate-900 flex items-center justify-center">
            <svg ref={barcodeRef} />
          </div>
          <div className="p-3 flex items-center justify-between">
            <div>
              <p className="font-black text-lg">MILEX AIR</p>
              <p className="text-xs">Tracking #: {shipment.awbNumber}</p>
            </div>
            <p className="text-3xl font-black">{shipment.shipmentMode === 'EXPORT' ? 'EXP' : 'IMP'}</p>
          </div>
        </div>
      )}
    </PrintShell>
  );
};

export default LabelPrintView;