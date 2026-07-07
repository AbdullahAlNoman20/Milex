// src/Pages/modules/sales/services/customerService.js
const CUSTOMERS_ENDPOINT = '/data/customers.json';
const BARCODE_PREFIX = 'MLX';
const REQUEST_TIMEOUT_MS = 10000;

export const fetchCustomers = async () => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(CUSTOMERS_ENDPOINT, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch customers: ${res.status}`);
    }

    const data = await res.json();
    if (!Array.isArray(data)) {
      throw new Error('Invalid customers payload: expected an array');
    }
    return data;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const generateBarcode = () => {
  const randomPart = Math.floor(100000 + Math.random() * 900000);
  return `${BARCODE_PREFIX}${randomPart}`;
};

export const buildHistoryEntry = (actionText, subText = '') => {
  const safeAction = typeof actionText === 'string' ? actionText.trim().slice(0, 200).toUpperCase() : '';
  const safeSubText = typeof subText === 'string' ? subText.trim().slice(0, 300) : '';
  const now = new Date();
  const date =
    now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' - ' +
    now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return {
    date,
    action: safeAction,
    subText: safeSubText,
    status: 'active',
  };
};

export const calculateProvisionalExpiry = (createdAt, validityDays, extensionDays = 0) => {
  const base = new Date(createdAt).getTime();
  if (!Number.isFinite(base)) return null;
  const totalDays = validityDays + extensionDays;
  return new Date(base + totalDays * 86400000).toISOString();
};

export const isProvisionalExpired = (expiryIso) => {
  const expiryMs = new Date(expiryIso).getTime();
  return Number.isFinite(expiryMs) && Date.now() >= expiryMs;
};