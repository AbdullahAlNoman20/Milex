// server/src/common/utils/businessDate.util.ts
// The server runs on UTC; the business runs on Dhaka time. Between midnight
// and 6am in Dhaka, "today" on the server is still yesterday — so every date
// rule that means "today" for a person is computed here, in their timezone,
// rather than from the machine's clock.
export const BUSINESS_TIMEZONE = process.env.BUSINESS_TIMEZONE || 'Asia/Dhaka';

const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: BUSINESS_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

// YYYY-MM-DD, which compares correctly as a plain string.
export const businessToday = (at: Date = new Date()): string => formatter.format(at);