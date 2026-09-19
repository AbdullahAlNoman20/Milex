// admin/src/Components/Shared/phoneFormat.js
export const BD_DIAL_CODE = '+880';
// Bangladeshi mobile numbers are 10 digits after the country code and always
// begin with 1 (01XXXXXXXXX written locally).
export const MAX_LOCAL_DIGITS = 10;

// Strips whatever the person pasted down to the national part, so
// "+8801712345678", "8801712345678" and "01712345678" all end up identical.
export const toLocalDigits = (value) => {
  if (typeof value !== 'string') return '';
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('880')) digits = digits.slice(3);
  if (digits.startsWith('0')) digits = digits.slice(1);
  return digits.slice(0, MAX_LOCAL_DIGITS);
};

export const toStoredPhone = (localDigits) =>
  localDigits ? `${BD_DIAL_CODE}${localDigits}` : '';

export const isValidBdPhone = (stored) => /^\+8801\d{9}$/.test(stored || '');