// admin/src/Components/utils/sanitize.js
const HTML_ESCAPE_MAP = Object.freeze({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
});

// Only for the few places that build raw markup (print templates). It must
// NOT be used on values heading to the API — React escapes on render and the
// server strips tags on write, so escaping here as well meant "Rate & Fee"
// was being stored, and then displayed, as "Rate &amp; Fee".
export const escapeHtml = (value) => {
  if (typeof value !== 'string') return '';
  return value.replace(/[&<>"'/]/g, (ch) => HTML_ESCAPE_MAP[ch]);
};

// Trim + length cap only. Tag stripping is the server's job (single source
// of truth), which also means a value can never be double-processed.
export const sanitizeText = (value, { maxLength = 1000 } = {}) => {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
};

export const sanitizeObjectStrings = (obj, { maxLength = 1000 } = {}) => {
  if (!obj || typeof obj !== 'object') return obj;
  return Object.fromEntries(
    Object.entries(obj).map(([key, val]) => [
      key,
      typeof val === 'string' ? sanitizeText(val, { maxLength }) : val,
    ])
  );
};

export const stripNonNumeric = (value) => (typeof value === 'string' ? value.replace(/[^0-9]/g, '') : '');

export const sanitizePhoneInput = (value) => {
  if (typeof value !== 'string') return '';
  let cleaned = value.replace(/[^\d+]/g, '');
  cleaned = cleaned.replace(/(?!^)\+/g, '');
  return cleaned;
};

export const sanitizeEmailInput = (value) => (typeof value === 'string' ? value.replace(/\s/g, '') : '');

export const sanitizeFileName = (name) => {
  if (typeof name !== 'string') return '';
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 255);
};