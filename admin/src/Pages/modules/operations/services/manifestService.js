// src/Pages/modules/operations/services/manifestService.js
import { loadCollection, saveCollection, nextId } from './operationsDataService';
import { fetchShipmentByAwb, updateShipmentStatus } from './shipmentService';
import { getStatusIndex } from '../constants/shipmentStatus';

const COLLECTION_KEY = 'manifests';
const SEED_URL = '/data/operationsManifests.json';

export const fetchManifests = async () => loadCollection(COLLECTION_KEY, SEED_URL);

export const findManifestByAwb = async (awbNumber) => {
  if (typeof awbNumber !== 'string' || !awbNumber.trim()) return null;
  const manifests = await fetchManifests();
  return manifests.find((m) => (m.awbNumbers || []).some((a) => a.toLowerCase() === awbNumber.trim().toLowerCase())) || null;
};

export const createManifest = async (draft) => {
  if (!draft || typeof draft !== 'object') throw new Error('Invalid manifest data');
  const flightNo = typeof draft.flightNo === 'string' ? draft.flightNo.trim() : '';
  if (!flightNo) throw new Error('Flight number is required');
  if (!Array.isArray(draft.awbNumbers) || draft.awbNumbers.length === 0) {
    throw new Error('Select at least one shipment for this manifest');
  }

  const records = await fetchManifests();
  const record = {
    id: nextId(records),
    flightNo,
    departureDate: draft.departureDate || '',
    origin: draft.origin || '',
    destination: draft.destination || '',
    awbNumbers: draft.awbNumbers,
    createdAt: new Date().toISOString(),
  };

  saveCollection(COLLECTION_KEY, [...records, record]);

  // Export-mode shipments move to MANIFESTED the moment they're placed on a
  // manifest, matching the tracking sequence's "Manifested" stage.
  for (const awb of draft.awbNumbers) {
    try {
      const shipment = await fetchShipmentByAwb(awb);
      if (!shipment || shipment.shipmentMode !== 'EXPORT') continue;
      const currentIdx = getStatusIndex('EXPORT', shipment.statusCode);
      const manifestedIdx = getStatusIndex('EXPORT', 'MANIFESTED');
      if (currentIdx < manifestedIdx) {
        await updateShipmentStatus(
          awb,
          { statusCode: 'MANIFESTED', note: `Added to manifest for flight ${flightNo}` },
          'System'
        );
      }
    } catch {
      /* individual shipment update failure should not block manifest creation */
    }
  }

  return record;
};