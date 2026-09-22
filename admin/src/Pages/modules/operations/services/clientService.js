// src/Pages/modules/operations/services/clientService.js
import { loadCollection, saveCollection, nextId } from './operationsDataService';

const COLLECTION_KEY = 'clients';
const SEED_URL = '/data/operationsClients.json';

export const fetchClients = async () => loadCollection(COLLECTION_KEY, SEED_URL);

export const fetchClientById = async (id) => {
  const records = await fetchClients();
  return records.find((c) => String(c.id) === String(id)) || null;
};

export const createClient = async (draft) => {
  if (!draft || typeof draft !== 'object') throw new Error('Invalid client data');
  const records = await fetchClients();
  const record = { id: nextId(records), createdAt: new Date().toISOString(), ...draft };
  const updated = [...records, record];
  saveCollection(COLLECTION_KEY, updated);
  return record;
};

export const updateClient = async (id, updates = {}) => {
  const records = await fetchClients();
  let updatedRecord = null;
  const updated = records.map((c) => {
    if (String(c.id) !== String(id)) return c;
    updatedRecord = { ...c, ...updates, updatedAt: new Date().toISOString() };
    return updatedRecord;
  });
  if (!updatedRecord) throw new Error('Client not found');
  saveCollection(COLLECTION_KEY, updated);
  return updatedRecord;
};