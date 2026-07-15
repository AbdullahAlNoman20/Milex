// admin/src/Components/utils/format.js (NEW FILE)
export const formatRevision = (revision) => (revision > 0 ? `R-${revision}` : 'New');

export const formatRateRef = (customer) => {
  if (!customer?.rateRef) return null;
  return `REF-${customer.rateRef}${customer.revision > 0 ? `-R${customer.revision}` : ''}`;
};

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