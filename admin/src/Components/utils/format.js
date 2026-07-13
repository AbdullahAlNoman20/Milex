// admin/src/Components/utils/format.js (NEW FILE)
export const formatRevision = (revision) => (revision > 0 ? `R-${revision}` : 'New');

export const humanizeStatus = (value) => {
  if (typeof value !== 'string' || !value) return '';
  return value
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};