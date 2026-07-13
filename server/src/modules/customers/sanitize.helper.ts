// src/modules/customers/sanitize.helper.ts
import createDOMPurify from 'isomorphic-dompurify';

// Stored XSS defense: sanitize all rich-text/user-generated fields before DB insert.
export const sanitizeAndEscape = <T extends Record<string, unknown>>(input: T): T => {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === 'string') {
      output[key] = createDOMPurify.sanitize(value, { ALLOWED_TAGS: [] }).trim();
    } else {
      output[key] = value;
    }
  }
  return output as T;
};