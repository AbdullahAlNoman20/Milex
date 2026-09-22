// src/Pages/modules/operations/services/returnService.js
import { loadCollection, saveCollection, nextId } from './operationsDataService';
import { fetchShipmentByAwb } from './shipmentService';
import { addLogEntry } from './statusLogService';

const COLLECTION_KEY = 'returns';
const SEED_URL = '/data/operationsReturns.json';

export const RETURN_REASONS = Object.freeze(['Customer Refused', 'Address Issue', 'Damaged', 'Customs Rejected', 'Other']);
export const RETURN_STATUS = Object.freeze({
  LOGGED: 'LOGGED',
  IN_RETURN_TRANSIT: 'IN_RETURN_TRANSIT',
  COMPLETED: 'COMPLETED',
});

export const fetchReturns = async () => loadCollection(COLLECTION_KEY, SEED_URL);

export const createReturn = async (draft, actorName = 'System') => {
  const awbNumber = typeof draft.awbNumber === 'string' ? draft.awbNumber.trim() : '';
  if (!awbNumber) throw new Error('Original AWB / CN number is required');
  if (!draft.reason) throw new Error('Return reason is required');

  const shipment = await fetchShipmentByAwb(awbNumber);
  if (!shipment) throw new Error('No shipment found for this AWB / CN number');

  const records = await fetchReturns();
  const record = {
    id: nextId(records),
    awbNumber,
    reason: draft.reason,
    remarks: typeof draft.remarks === 'string' ? draft.remarks.slice(0, 500) : '',
    status: RETURN_STATUS.LOGGED,
    loggedBy: actorName,
    createdAt: new Date().toISOString(),
  };

  saveCollection(COLLECTION_KEY, [record, ...records]);

  await addLogEntry({
    awbNumber,
    status: 'Return Initiated',
    exceptionCode: null,
    note: `Return logged: ${draft.reason}`,
    updatedBy: actorName,
  });

  return record;
};

export const updateReturnStatus = async (id, status) => {
  if (!Object.values(RETURN_STATUS).includes(status)) throw new Error('Invalid return status');
  const records = await fetchReturns();
  let updatedRecord = null;
  const updated = records.map((r) => {
    if (String(r.id) !== String(id)) return r;
    updatedRecord = { ...r, status, updatedAt: new Date().toISOString() };
    return updatedRecord;
  });
  if (!updatedRecord) throw new Error('Return record not found');
  saveCollection(COLLECTION_KEY, updated);
  return updatedRecord;
};