// admin/src/Components/Shared/passwordRules.js
// Kept out of the component file so the rules can be read anywhere without
// importing a component — which is also what lets the field hot-reload.
export const PASSWORD_RULES = [
  { key: 'length', label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { key: 'upper', label: 'One uppercase letter (A-Z)', test: (v) => /[A-Z]/.test(v) },
  { key: 'lower', label: 'One lowercase letter (a-z)', test: (v) => /[a-z]/.test(v) },
  { key: 'digit', label: 'One number (0-9)', test: (v) => /\d/.test(v) },
  { key: 'special', label: 'One special character (! @ # $ …)', test: (v) => /[^A-Za-z0-9]/.test(v) },
];

export const isPasswordValid = (value) =>
  typeof value === 'string' && PASSWORD_RULES.every((r) => r.test(value));