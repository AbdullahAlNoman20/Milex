// src/Pages/modules/operations/services/routeService.js
import { loadCollection, saveCollection, nextId } from './operationsDataService';

const COLLECTION_KEY = 'routes';
const SEED_URL = '/data/operationsRoutes.json';

export const fetchRoutes = async () => loadCollection(COLLECTION_KEY, SEED_URL);

export const createRoute = async (draft) => {
  if (typeof draft.lane !== 'string' || !draft.lane.trim()) throw new Error('Lane is required');
  if (typeof draft.carrier !== 'string' || !draft.carrier.trim()) throw new Error('Carrier is required');

  const records = await fetchRoutes();
  const record = {
    id: nextId(records),
    lane: draft.lane.trim(),
    mode: draft.mode || 'Air',
    carrier: draft.carrier.trim(),
    avgTransitDays: Number(draft.avgTransitDays) || 0,
    status: 'ACTIVE',
  };

  saveCollection(COLLECTION_KEY, [...records, record]);
  return record;
};