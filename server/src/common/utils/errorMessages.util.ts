// server/src/common/utils/errorMessages.util.ts — NEW FILE
// Central place for every human-facing error phrase used across the app.
// Goal: a non-technical person should be able to read any message here and
// understand what happened and what to do next — no jargon, no field names
// like "zod", "Prisma", stack traces, or internal codes.

export const FRIENDLY_MESSAGES = {
  GENERIC_SERVER_ERROR: "Something went wrong on our end. Please try again in a moment. If this keeps happening, contact support.",
  GENERIC_VALIDATION: "Some of the information you entered doesn't look right. Please review the form and try again.",
  SESSION_EXPIRED: "Your session has expired. Please log in again.",
  NOT_LOGGED_IN: "Please log in to continue.",
  ACCOUNT_DEACTIVATED: "Your account is no longer active. Please contact your administrator.",
  SECURITY_CHECK_FAILED: "For your security, please refresh the page and try again.",
  NO_PERMISSION: "You don't have permission to do this. If you think this is a mistake, contact your administrator.",
  RECORD_NOT_FOUND: "We couldn't find what you were looking for. It may have been removed or moved.",
  DUPLICATE_RECORD: "This already exists. Please use a different value.",
  NETWORK_ERROR: "We couldn't reach the server. Please check your internet connection and try again.",
  REQUEST_TIMEOUT: "This is taking longer than expected. Please try again.",
};

export const humanizeZodMessage = (rawMessage: string, path: (string | number)[]): string => {
  const fieldName = String(path[path.length - 1] || '').replace(/([A-Z])/g, ' $1').toLowerCase().trim();
  const field = fieldName || 'this field';

  if (/unrecognized key/i.test(rawMessage)) {
    return "Some information sent doesn't match what was expected. Please refresh the page and try again.";
  }
  if (/required/i.test(rawMessage) || /expected string, received undefined/i.test(rawMessage)) {
    return `Please fill in ${field}.`;
  }
  if (/invalid email/i.test(rawMessage)) {
    return "Please enter a valid email address.";
  }
  if (/at least (\d+) character/i.test(rawMessage)) {
    const match = rawMessage.match(/at least (\d+) character/i);
    return `${field.charAt(0).toUpperCase() + field.slice(1)} must be at least ${match?.[1] || 'a few'} characters long.`;
  }
  if (/at most (\d+) character/i.test(rawMessage)) {
    const match = rawMessage.match(/at most (\d+) character/i);
    return `${field.charAt(0).toUpperCase() + field.slice(1)} is too long (maximum ${match?.[1] || 'a limited number of'} characters).`;
  }
  if (/invalid enum value|invalid option/i.test(rawMessage)) {
    return `The value chosen for ${field} isn't a valid option. Please refresh the page and try again.`;
  }
  if (/invalid date/i.test(rawMessage)) {
    return "Please choose a valid date.";
  }
  if (/expected number/i.test(rawMessage)) {
    return `${field.charAt(0).toUpperCase() + field.slice(1)} must be a valid number.`;
  }
  // If the schema already provided a clear custom message (no zod jargon), keep it as-is.
  if (!/zod|schema|parse|refine/i.test(rawMessage)) {
    return rawMessage;
  }
  return FRIENDLY_MESSAGES.GENERIC_VALIDATION;
};