// src/Pages/modules/operations/services/invoiceService.js
import { loadCollection, saveCollection, nextId } from './operationsDataService';

const COLLECTION_KEY = 'invoices';
const SEED_URL = '/data/operationsInvoices.json';

export const fetchInvoices = async () => loadCollection(COLLECTION_KEY, SEED_URL);

export const fetchInvoiceByAwb = async (awbNumber) => {
  if (typeof awbNumber !== 'string' || !awbNumber.trim()) return null;
  const records = await fetchInvoices();
  return records.find((i) => i.awbNumber.toLowerCase() === awbNumber.trim().toLowerCase()) || null;
};

export const createOrUpdateInvoice = async (draft) => {
  if (!draft || typeof draft !== 'object') throw new Error('Invalid invoice data');
  const awbNumber = typeof draft.awbNumber === 'string' ? draft.awbNumber.trim() : '';
  if (!awbNumber) throw new Error('AWB Number is required');
  if (!Array.isArray(draft.items) || draft.items.length === 0) throw new Error('At least one item line is required');

  const records = await fetchInvoices();
  const existingIdx = records.findIndex((i) => i.awbNumber.toLowerCase() === awbNumber.toLowerCase());
  const now = new Date().toISOString();
  const total = draft.items.reduce((sum, it) => sum + (Number(it.unitCost) || 0) * (Number(it.pcs) || 0), 0);

  const record = {
    id: existingIdx >= 0 ? records[existingIdx].id : nextId(records),
    awbNumber,
    invoiceDate: draft.invoiceDate || now.slice(0, 10),
    shipper: draft.shipper || {},
    consignee: draft.consignee || {},
    binNumber: draft.binNumber || '',
    items: draft.items,
    total,
    additionalComment: draft.additionalComment || '',
    createdAt: existingIdx >= 0 ? records[existingIdx].createdAt : now,
    updatedAt: now,
  };

  const updated =
    existingIdx >= 0 ? records.map((r, idx) => (idx === existingIdx ? record : r)) : [...records, record];

  saveCollection(COLLECTION_KEY, updated);
  return record;
};