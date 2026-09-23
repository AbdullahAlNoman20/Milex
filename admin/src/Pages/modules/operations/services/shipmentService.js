// src/Pages/modules/operations/services/shipmentService.js
import { loadCollection, saveCollection, nextId } from './operationsDataService';
import { addLogEntry } from './statusLogService';
import { createOrUpdateInvoice } from './invoiceService';
import { getSequenceForMode } from '../constants/shipmentStatus';

const COLLECTION_KEY = 'shipments';
const SEED_URL = '/data/operationsShipments.json';

export const fetchShipments = async () => loadCollection(COLLECTION_KEY, SEED_URL);

export const fetchShipmentByAwb = async (awbNumber) => {
  if (typeof awbNumber !== 'string' || !awbNumber.trim()) return null;
  const records = await fetchShipments();
  return (
    records.find((s) => s.awbNumber.toLowerCase() === awbNumber.trim().toLowerCase()) || null
  );
};

export const fetchShipmentsByClientEmail = async (email) => {
  if (typeof email !== 'string' || !email.trim()) return [];
  const records = await fetchShipments();
  return records.filter(
    (s) => typeof s.clientEmail === 'string' && s.clientEmail.toLowerCase() === email.trim().toLowerCase()
  );
};

export const createShipment = async (draft, actorName = 'System') => {
  if (!draft || typeof draft !== 'object') throw new Error('Invalid shipment data');
  const awbNumber = typeof draft.awbNumber === 'string' ? draft.awbNumber.trim() : '';
  if (!awbNumber) throw new Error('AWB / CN number is required');

  const records = await fetchShipments();
  const duplicate = records.some((s) => s.awbNumber.toLowerCase() === awbNumber.toLowerCase());
  if (duplicate) throw new Error('This AWB / CN number already exists');

  const mode = draft.shipmentMode === 'IMPORT' ? 'IMPORT' : 'EXPORT';
  const sequence = getSequenceForMode(mode);
  const initialStatus = sequence[0];
  const now = new Date().toISOString();

  const record = {
    id: nextId(records),
    awbNumber,
    refNo: draft.refNo || '',
    costCarriedBy: draft.costCarriedBy || '',
    bookingDate: draft.bookingDate || now.slice(0, 10),
    shipmentMode: mode,
    clientEmail: draft.clientEmail || '',
    pickup: draft.pickup || {},
    receiver: draft.receiver || {},
    parcel: draft.parcel || {},
    documents: Array.isArray(draft.documents) ? draft.documents : [],
    shipmentType: draft.shipmentType || 'NON_DOCUMENT',
    packaging: draft.packaging || '',
    services: Array.isArray(draft.services) ? draft.services : [],
    paymentTransportBy: draft.paymentTransportBy || '',
    paymentTransportAcNo: draft.paymentTransportAcNo || '',
    paymentDutiesBy: draft.paymentDutiesBy || '',
    paymentDutiesAcNo: draft.paymentDutiesAcNo || '',
    weightCorrections: [],
    statusCode: initialStatus.code,
    statusLabel: initialStatus.label,
    exceptionCode: null,
    createdAt: now,
    updatedAt: now,
  };

  saveCollection(COLLECTION_KEY, [...records, record]);

  await addLogEntry({
    awbNumber: record.awbNumber,
    status: record.statusLabel,
    exceptionCode: null,
    note: 'Shipment booked / AWB generated',
    updatedBy: actorName,
  });

  // Auto-create a starter Commercial Invoice from the AWB's own parcel data
  // so AWB + Invoice stay linked from the moment of booking — the admin can
  // still refine line items later via Commercial Invoice Generate.
  try {
    await createOrUpdateInvoice({
      awbNumber: record.awbNumber,
      invoiceDate: record.bookingDate,
      shipper: record.pickup,
      consignee: record.receiver,
      binNumber: '',
      items: [{
        description: record.parcel?.shipmentContents || 'Shipment',
        hsCode: '',
        pcs: record.parcel?.pieces || 1,
        unitCost: record.parcel?.declaredValue
          ? (Number(record.parcel.declaredValue) / (Number(record.parcel.pieces) || 1)).toFixed(2)
          : '0',
      }],
      additionalComment: 'Auto-generated from AWB booking — refine via Commercial Invoice Generate if needed.',
    });
  } catch {
    /* invoice auto-generation is a convenience, not a hard requirement for AWB creation */
  }

  return record;
};

export const updateShipmentStatus = async (
  awbNumber,
  { statusCode, exceptionCode = null, note = '' },
  actorName = 'System'
) => {
  const trimmedAwb = typeof awbNumber === 'string' ? awbNumber.trim() : '';
  if (!trimmedAwb) throw new Error('AWB / CN number is required');

  const records = await fetchShipments();
  let updatedRecord = null;

  const updated = records.map((s) => {
    if (s.awbNumber.toLowerCase() !== trimmedAwb.toLowerCase()) return s;
    const sequence = getSequenceForMode(s.shipmentMode);
    const step = sequence.find((x) => x.code === statusCode) || sequence[0];
    updatedRecord = {
      ...s,
      statusCode: step.code,
      statusLabel: step.label,
      exceptionCode: exceptionCode || null,
      updatedAt: new Date().toISOString(),
    };
    return updatedRecord;
  });

  if (!updatedRecord) throw new Error('Shipment not found for this AWB / CN number');
  saveCollection(COLLECTION_KEY, updated);

  await addLogEntry({
    awbNumber: updatedRecord.awbNumber,
    status: updatedRecord.statusLabel,
    exceptionCode: updatedRecord.exceptionCode,
    note,
    updatedBy: actorName,
  });

  return updatedRecord;
};

export const generateAwbNumber = async (mode) => {
  const records = await fetchShipments();
  const prefix = mode === 'IMPORT' ? 'MLI' : 'MLE';
  let candidate;
  do {
    candidate = `${prefix}-${100000 + Math.floor(Math.random() * 900000)}`;
  } while (records.some((r) => r.awbNumber === candidate));
  return candidate;
};

export const updateShipmentDocuments = async (awbNumber, documents) => {
  const trimmedAwb = typeof awbNumber === 'string' ? awbNumber.trim() : '';
  if (!trimmedAwb) throw new Error('AWB / CN number is required');
  const records = await fetchShipments();
  let updatedRecord = null;
  const updated = records.map((s) => {
    if (s.awbNumber.toLowerCase() !== trimmedAwb.toLowerCase()) return s;
    updatedRecord = { ...s, documents: Array.isArray(documents) ? documents : [], updatedAt: new Date().toISOString() };
    return updatedRecord;
  });
  if (!updatedRecord) throw new Error('Shipment not found for this AWB / CN number');
  saveCollection(COLLECTION_KEY, updated);
  return updatedRecord;
};

// Stores an uploaded file (as a data URL) against a named document slot on
// the shipment, and keeps the checklist array in sync so DocumentsUpload
// and AWB Generate's checklist always reflect real upload state.
export const updateShipmentDocumentFile = async (awbNumber, docName, fileMeta) => {
  const trimmedAwb = typeof awbNumber === 'string' ? awbNumber.trim() : '';
  if (!trimmedAwb) throw new Error('AWB / CN number is required');
  const records = await fetchShipments();
  let updatedRecord = null;
  const updated = records.map((s) => {
    if (s.awbNumber.toLowerCase() !== trimmedAwb.toLowerCase()) return s;
    const documentFiles = { ...(s.documentFiles || {}) };
    if (fileMeta) {
      documentFiles[docName] = fileMeta;
    } else {
      delete documentFiles[docName];
    }
    const documents = fileMeta
      ? Array.from(new Set([...(s.documents || []), docName]))
      : (s.documents || []).filter((d) => d !== docName);
    updatedRecord = { ...s, documentFiles, documents, updatedAt: new Date().toISOString() };
    return updatedRecord;
  });
  if (!updatedRecord) throw new Error('Shipment not found for this AWB / CN number');
  saveCollection(COLLECTION_KEY, updated);
  return updatedRecord;
};

// Admin overrides a client-declared weight. Always logged to the status log
// (audit trail) — per the workflow doc's "Weight Correction by MILEX
// Operations" requirement.
export const correctShipmentWeight = async (awbNumber, newWeightKg, reason, actorName = 'System') => {
  const trimmedAwb = typeof awbNumber === 'string' ? awbNumber.trim() : '';
  if (!trimmedAwb) throw new Error('AWB / CN number is required');
  const weight = Number(newWeightKg);
  if (!Number.isFinite(weight) || weight <= 0) throw new Error('New weight must be a valid positive number');

  const records = await fetchShipments();
  let updatedRecord = null;
  let previousWeight = null;

  const updated = records.map((s) => {
    if (s.awbNumber.toLowerCase() !== trimmedAwb.toLowerCase()) return s;
    previousWeight = s.parcel?.weightKg;
    const weightCorrections = [
      ...(s.weightCorrections || []),
      { from: previousWeight, to: weight, reason: reason || '', by: actorName, at: new Date().toISOString() },
    ];
    updatedRecord = {
      ...s,
      parcel: { ...s.parcel, weightKg: weight },
      weightCorrections,
      updatedAt: new Date().toISOString(),
    };
    return updatedRecord;
  });

  if (!updatedRecord) throw new Error('Shipment not found for this AWB / CN number');
  if (previousWeight === weight) throw new Error('New weight is the same as the current weight');
  saveCollection(COLLECTION_KEY, updated);

  await addLogEntry({
    awbNumber: updatedRecord.awbNumber,
    status: 'Weight Corrected',
    exceptionCode: null,
    note: `Weight corrected from ${previousWeight} kg to ${weight} kg by MILEX Operations${reason ? ` — ${reason}` : ''}`,
    updatedBy: actorName,
  });

  return updatedRecord;
};

export const updateShipmentPod = async (awbNumber, podData, actorName = 'System') => {
  const trimmedAwb = typeof awbNumber === 'string' ? awbNumber.trim() : '';
  if (!trimmedAwb) throw new Error('AWB / CN number is required');

  const records = await fetchShipments();
  let updatedRecord = null;

  const updated = records.map((s) => {
    if (s.awbNumber.toLowerCase() !== trimmedAwb.toLowerCase()) return s;
    updatedRecord = {
      ...s,
      pod: { ...podData },
      statusCode: 'DELIVERED',
      statusLabel: 'Delivered',
      updatedAt: new Date().toISOString(),
    };
    return updatedRecord;
  });

  if (!updatedRecord) throw new Error('Shipment not found for this AWB / CN number');
  saveCollection(COLLECTION_KEY, updated);

  await addLogEntry({
    awbNumber: updatedRecord.awbNumber,
    status: 'POD Updated',
    exceptionCode: null,
    note: podData?.remarks || 'POD updated',
    updatedBy: actorName,
  });

  return updatedRecord;
};