// admin/src/Components/utils/format.js
export const formatRevision = (revision) => (revision > 0 ? `R-${revision}` : 'New');

const RATE_SOURCE_LABELS = {
  LINE_MANAGER: 'Line Manager',
  HEAD_OF_DEPARTMENT: 'Head of Department',
};

export const rateSourceLabel = (source) => RATE_SOURCE_LABELS[source] || 'Line Manager';

// The reference is anchored to the customer's own id and never changes for
// the life of the account — a hundred revisions later it is still the same
// code with a different suffix, which is what makes it usable as a filing
// reference on paper. Inbound service carries an IB marker so the two
// directions can be told apart at a glance; outbound is the plain form.
export const buildRateRefs = (customer) => {
  if (!customer) return [];
  const base = customer.rateRef || customer.barcode;
  if (!base) return [];
  const suffix = customer.revision > 0 ? `-R${customer.revision}` : '';
  const service = customer.serviceRequired;

  if (service === 'IB') return [`REF-${base}IB${suffix}`];
  // Both directions are quoted, so both references exist side by side.
  if (service === 'BOTH') return [`REF-${base}IB${suffix}`, `REF-${base}${suffix}`];
  return [`REF-${base}${suffix}`];
};

export const formatRateRef = (customer) => buildRateRefs(customer)[0] || null;

export const humanizeAction = (value) => {
  if (typeof value !== 'string' || !value) return '';
  return value
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
};

export const humanizeStatus = (value) => {
  if (typeof value !== 'string' || !value) return '';
  return value
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// "Just now" / "5m ago" / "3h ago" / "1 day ago" / "4 days ago" — used
// anywhere a notification timestamp needs to read naturally instead of a
// raw date.
export const formatRelativeTime = (dateInput) => {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return 'Just now';

  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'Just now';

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;

  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return '1 day ago';
  if (diffDay < 7) return `${diffDay} days ago`;

  const diffWeek = Math.floor(diffDay / 7);
  if (diffWeek === 1) return '1 week ago';
  if (diffWeek < 5) return `${diffWeek} weeks ago`;

  return date.toLocaleDateString();
};