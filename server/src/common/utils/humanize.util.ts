export const humanizeStatus = (value: string): string => {
  if (!value) return '';
  return value
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
};