// src/Pages/modules/operations/services/operationsDataService.js
// Generic JSON-seed + localStorage-overlay persistence layer. Loads initial
// records from a static /data/*.json seed file once, then all subsequent
// reads/writes go through a per-key localStorage overlay so the module can
// simulate a real backend before one exists. Backend dev: replace the
// implementations of loadCollection/saveCollection with real API calls and
// every caller (clientService, etc.) keeps working unchanged.
const STORAGE_PREFIX = 'milex_ops_data_';

const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const readOverlay = (key) => {
  if (!isBrowser) return null;
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const writeOverlay = (key, records) => {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(records));
  } catch {
    /* storage unavailable / quota exceeded — fail silently, in-memory state still works */
  }
};

const seedCache = new Map();

const loadSeed = async (key, seedUrl) => {
  if (seedCache.has(key)) return seedCache.get(key);
  const res = await fetch(seedUrl, { credentials: 'same-origin' });
  if (!res.ok) throw new Error(`Failed to load seed data: ${seedUrl}`);
  const data = await res.json();
  const records = Array.isArray(data) ? data : [];
  seedCache.set(key, records);
  return records;
};

export const loadCollection = async (key, seedUrl) => {
  const overlay = readOverlay(key);
  if (overlay) return overlay;
  const seed = await loadSeed(key, seedUrl);
  writeOverlay(key, seed);
  return seed;
};

export const saveCollection = (key, records) => {
  if (!Array.isArray(records)) throw new Error('records must be an array');
  writeOverlay(key, records);
  return records;
};

export const nextId = (records) => {
  const max = records.reduce((acc, r) => (typeof r?.id === 'number' && r.id > acc ? r.id : acc), 0);
  return max + 1;
};

export const resetCollection = (key) => {
  if (!isBrowser) return;
  try {
    window.localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
  } catch {
    /* noop */
  }
  seedCache.delete(key);
};