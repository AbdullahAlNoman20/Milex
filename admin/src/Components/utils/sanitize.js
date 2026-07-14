// src/Components/utils/sanitize.js
const HTML_ESCAPE_MAP = Object.freeze({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
});

export const escapeHtml = (value) => {
  if (typeof value !== 'string') return '';
  return value.replace(/[&<>"'/]/g, (ch) => HTML_ESCAPE_MAP[ch]);
};

export const sanitizeText = (value, { maxLength = 1000 } = {}) => {
  if (typeof value !== 'string') return '';
  return escapeHtml(value.trim()).slice(0, maxLength);
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