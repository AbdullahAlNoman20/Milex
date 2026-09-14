// server/src/modules/customers/sanitize.helper.ts
import createDOMPurify from 'isomorphic-dompurify';

// DOMPurify strips tags AND html-entity-encodes what remains, so a plain
// business value like "Rate & Fee" came back as "Rate &amp; Fee" and got
// stored that way. React escapes on render anyway, so the encoded form was
// then shown to the user literally. We decode back to plain text after
// sanitising: tags/scripts are still gone, but ordinary punctuation
// survives a round-trip unchanged.
const ENTITY_MAP: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#34;': '"',
  '&#39;': "'",
  '&#x27;': "'",
  '&#x2F;': '/',
  '&#47;': '/',
  '&nbsp;': ' ',
};

const decodeEntities = (value: string): string =>
  value
    // Named/known entities first, then any remaining numeric ones.
    .replace(/&(?:amp|lt|gt|quot|nbsp|#34|#39|#x27|#x2F|#47);/gi, (m) => ENTITY_MAP[m.toLowerCase()] ?? ENTITY_MAP[m] ?? m)
    .replace(/&#(\d{1,6});/g, (_m, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]{1,6});/gi, (_m, code) => String.fromCodePoint(parseInt(code, 16)));

// Stored XSS defense: strip every tag before the value reaches the database.
export const sanitizeAndEscape = <T extends Record<string, unknown>>(input: T): T => {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === 'string') {
      const stripped = createDOMPurify.sanitize(value, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
      // Decode twice: a hand-crafted "&amp;lt;script&amp;gt;" must not be
      // able to survive one decode pass and reappear as a tag.
      const once = decodeEntities(stripped);
      const twice = decodeEntities(once);
      output[key] = createDOMPurify.sanitize(twice, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }) === twice
        ? twice.trim()
        : once.trim();
    } else {
      output[key] = value;
    }
  }
  return output as T;
};