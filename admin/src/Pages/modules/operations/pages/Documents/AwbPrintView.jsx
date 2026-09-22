// src/Pages/modules/operations/pages/Documents/AwbPrintView.jsx
import { useParams } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import PrintShell from '../../components/PrintShell';
import DocumentLinksPanel from '../../components/DocumentLinksPanel';
import Loader from '../../../../../Components/Shared/Loader';
import { fetchShipmentByAwb } from '../../services/shipmentService';

const Checkbox = ({ label, checked }) => (
  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 mr-5">
    <span className={`w-3.5 h-3.5 border border-slate-700 inline-flex items-center justify-center shrink-0 ${checked ? 'bg-emerald-600' : ''}`}>
      {checked && <span className="text-white text-[9px] leading-none">✓</span>}
    </span>
    {label}
  </span>
);

const AwbPrintView = () => {
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
      setShipment(found);
    } catch {
      setLoadError('Failed to load shipment.');
    } finally {
      setIsLoading(false);
    }
  }, [awbNumber]);

  useEffect(() => { load(); }, [load]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader label="Loading AWB..." />
      </div>
    );
  }

  return (
    <PrintShell
      title="International Air Waybill"
      fileName={`AWB-${awbNumber}`}
      sidebar={!loadError && shipment ? <DocumentLinksPanel shipment={shipment} /> : null}
    >
      {loadError ? (

        <p className="text-sm text-red-600 font-semibold">{loadError}</p>
      ) : (
        <div className="text-xs">
          <div className="flex justify-between items-center mb-3">
            <p className="font-bold">AWB No: <span className="text-emerald-700">{shipment.awbNumber}</span></p>
            <p className="font-bold">Date: {shipment.bookingDate}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 border border-slate-800 mb-3">
            <div className="border-r border-slate-800">
              <p className="bg-slate-800 text-white text-[10px] font-bold px-2 py-1">01 SENDER</p>
              <div className="p-2 space-y-0.5">
                <p className="font-bold">{shipment.pickup?.companyName}</p>
                <p>{shipment.pickup?.contactPerson}</p>
                <p>{shipment.pickup?.address}</p>
                <p>{shipment.pickup?.city}, {shipment.pickup?.postCode}</p>
                <p>{shipment.pickup?.country}</p>
                <p>Phone: {shipment.pickup?.contactPhone}</p>
                <p>Email: {shipment.pickup?.contactEmail}</p>
              </div>
            </div>
            <div>
              <p className="bg-slate-800 text-white text-[10px] font-bold px-2 py-1">02 RECIPIENT</p>
              <div className="p-2 space-y-0.5">
                <p className="font-bold">{shipment.receiver?.companyName}</p>
                <p>{shipment.receiver?.contactPerson}</p>
                <p>{shipment.receiver?.address}</p>
                <p>{shipment.receiver?.city}, {shipment.receiver?.postCode}</p>
                <p>{shipment.receiver?.country}</p>
                <p>Phone: {shipment.receiver?.contactPhone}</p>
                <p>Email: {shipment.receiver?.contactEmail}</p>
              </div>
            </div>
          </div>

          <div className="border border-slate-800 p-2 mb-3">
            <p className="font-bold mb-1.5">03 SHIPMENT INFORMATION</p>
            <div className="flex flex-wrap items-center gap-y-1">
              <Checkbox label="Document" checked={shipment.shipmentType === 'DOCUMENT'} />
              <Checkbox label="Non-Document" checked={shipment.shipmentType === 'NON_DOCUMENT'} />
              <span className="mr-5">No. of Pcs: <b>{shipment.parcel?.pieces}</b></span>
              <span className="mr-5">Origin: <b>{shipment.pickup?.city}</b></span>
              <span>Destination: <b>{shipment.receiver?.city}</b></span>
            </div>
          </div>

          <div className="border border-slate-800 mb-3">
            <p className="bg-slate-800 text-white text-[10px] font-bold px-2 py-1">04 DESCRIPTION OF CONTENT</p>
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-300 text-left">
                  <th className="p-1.5">Description</th>
                  <th className="p-1.5 text-center">Pcs</th>
                  <th className="p-1.5 text-center">Weight (kg)</th>
                  <th className="p-1.5 text-center">Value</th>
                  <th className="p-1.5 text-center">Currency</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-1.5">{shipment.parcel?.shipmentContents}</td>
                  <td className="p-1.5 text-center">{shipment.parcel?.pieces}</td>
                  <td className="p-1.5 text-center">{shipment.parcel?.weightKg}</td>
                  <td className="p-1.5 text-center">{shipment.parcel?.declaredValue || '—'}</td>
                  <td className="p-1.5 text-center">{shipment.parcel?.currency || 'USD'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div className="border border-slate-800 p-2">
              <p className="font-bold mb-1.5">07 PAYMENT — TRANSPORTATION CHARGES TO</p>
              <div className="flex flex-wrap">
                <Checkbox label="Sender" checked={shipment.paymentTransportBy === 'Sender'} />
                <Checkbox label="Recipient" checked={shipment.paymentTransportBy === 'Recipient'} />
                <Checkbox label="Third Party" checked={shipment.paymentTransportBy === 'Third Party'} />
              </div>
              {shipment.paymentTransportAcNo && <p className="mt-1 text-slate-500">A/C No: {shipment.paymentTransportAcNo}</p>}
            </div>
            <div className="border border-slate-800 p-2">
              <p className="font-bold mb-1.5">08 PAYMENT — DUTIES & TAXES TO</p>
              <div className="flex flex-wrap">
                <Checkbox label="Sender" checked={shipment.paymentDutiesBy === 'Sender'} />
                <Checkbox label="Recipient" checked={shipment.paymentDutiesBy === 'Recipient'} />
                <Checkbox label="Third Party" checked={shipment.paymentDutiesBy === 'Third Party'} />
              </div>
              {shipment.paymentDutiesAcNo && <p className="mt-1 text-slate-500">A/C No: {shipment.paymentDutiesAcNo}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            <div className="border border-slate-800 p-2">
              <p className="font-bold mb-1.5">09 PACKAGING</p>
              <div className="flex flex-wrap">
                <Checkbox label="Envelope" checked={shipment.packaging === 'Envelope'} />
                <Checkbox label="Pouch" checked={shipment.packaging === 'Pouch'} />
                <Checkbox label="Carton" checked={shipment.packaging === 'Carton'} />
              </div>
            </div>
            <div className="border border-slate-800 p-2">
              <p className="font-bold mb-1.5">10 SERVICES</p>
              <div className="flex flex-wrap">
                {['Express', 'Premium', 'Special', 'e-Parcel'].map((s) => (
                  <Checkbox key={s} label={s} checked={(shipment.services || []).includes(s)} />
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 mt-10">
            <p className="border-t border-slate-800 pt-1 text-slate-500">Sender's Signature / Date</p>
            <p className="border-t border-slate-800 pt-1 text-slate-500">Received in Good Condition / Date</p>
          </div>

          <p className="text-center text-[9px] text-slate-400 mt-8 font-bold uppercase tracking-wide">
            MILEX Air — Non-Negotiable at Owner's Risk
          </p>
        </div>
      )}
    </PrintShell>
  );
};

export default AwbPrintView;