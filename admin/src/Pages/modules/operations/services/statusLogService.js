// src/Pages/modules/operations/services/statusLogService.js
import { loadCollection, saveCollection, nextId } from './operationsDataService';

const COLLECTION_KEY = 'statusLogs';
const SEED_URL = '/data/operationsStatusLogs.json';

export const fetchStatusLogs = async () => loadCollection(COLLECTION_KEY, SEED_URL);

export const fetchStatusLogsByAwb = async (awbNumber) => {
  if (typeof awbNumber !== 'string' || !awbNumber.trim()) return [];
  const logs = await fetchStatusLogs();
  return logs.filter((l) => l.awbNumber.toLowerCase() === awbNumber.trim().toLowerCase());
};

export const addLogEntry = async ({ awbNumber, status, exceptionCode = null, note = '', updatedBy = 'System' }) => {
  if (typeof awbNumber !== 'string' || !awbNumber.trim()) throw new Error('AWB number is required for a log entry');
  const logs = await fetchStatusLogs();
  const entry = {
    id: nextId(logs),
    awbNumber: awbNumber.trim(),
    status: status || '',
    exceptionCode: exceptionCode || null,
    note: typeof note === 'string' ? note.slice(0, 500) : '',
    updatedBy: updatedBy || 'System',
    updatedAt: new Date().toISOString(),
  };
  saveCollection(COLLECTION_KEY, [entry, ...logs]);
  return entry;
};