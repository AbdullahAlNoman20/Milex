// src/Pages/modules/operations/services/claimService.js
import { loadCollection, saveCollection, nextId } from './operationsDataService';
import { fetchShipmentByAwb } from './shipmentService';

const COLLECTION_KEY = 'claims';
const SEED_URL = '/data/operationsClaims.json';

export const CLAIM_TYPES = Object.freeze(['Delay', 'Damage', 'Loss', 'Short Shipment']);
export const CLAIM_STATUS = Object.freeze({
  UNDER_REVIEW: 'UNDER_REVIEW',
  RESOLVED: 'RESOLVED',
  REJECTED: 'REJECTED',
});

export const fetchClaims = async () => loadCollection(COLLECTION_KEY, SEED_URL);

export const createClaim = async (draft, actorName = 'System') => {
  const awbNumber = typeof draft.awbNumber === 'string' ? draft.awbNumber.trim() : '';
  if (!awbNumber) throw new Error('AWB / CN number is required');
  if (!draft.claimType) throw new Error('Claim type is required');
  if (typeof draft.description !== 'string' || !draft.description.trim()) throw new Error('Description is required');

  const shipment = await fetchShipmentByAwb(awbNumber);
  if (!shipment) throw new Error('No shipment found for this AWB / CN number');

  const records = await fetchClaims();
  const record = {
    id: nextId(records),
    awbNumber,
    claimType: draft.claimType,
    description: draft.description.slice(0, 1000),
    claimAmount: draft.claimAmount ? Number(draft.claimAmount) : null,
    status: CLAIM_STATUS.UNDER_REVIEW,
    raisedBy: actorName,
    createdAt: new Date().toISOString(),
  };

  saveCollection(COLLECTION_KEY, [record, ...records]);
  return record;
};

export const updateClaimStatus = async (id, status) => {
  if (!Object.values(CLAIM_STATUS).includes(status)) throw new Error('Invalid claim status');
  const records = await fetchClaims();
  let updatedRecord = null;
  const updated = records.map((c) => {
    if (String(c.id) !== String(id)) return c;
    updatedRecord = { ...c, status, updatedAt: new Date().toISOString() };
    return updatedRecord;
  });
  if (!updatedRecord) throw new Error('Claim not found');
  saveCollection(COLLECTION_KEY, updated);
  return updatedRecord;
};