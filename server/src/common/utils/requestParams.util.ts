// server/src/common/utils/requestParams.util.ts (NEW FILE)
// Express types query/params as string | string[] | ParsedQs | ParsedQs[] |
// undefined. Every route here only ever uses single flat values, so this
// narrows defensively instead of unsafely `as string` casting everywhere.
export const asString = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return fallback;
};

export const asOptionalString = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.length > 0) return value;
  if (Array.isArray(value) && typeof value[0] === 'string' && value[0].length > 0) return value[0];
  return undefined;
};