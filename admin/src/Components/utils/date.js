// admin/src/Components/utils/date.js 
// Local-date helpers — avoid `new Date().toISOString()` for "today" style
// values, since toISOString() always converts to UTC first. In UTC+6
// (Bangladesh) that silently shows yesterday's date for several hours after
// local midnight. These use the browser's local timezone instead.
export const todayLocalISO = (date = new Date()) => {
  const d = new Date(date);
  const offsetMs = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offsetMs).toISOString().slice(0, 10);
};