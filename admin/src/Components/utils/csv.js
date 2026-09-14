// admin/src/Components/utils/csv.js

// Excel and Google Sheets execute any cell whose text begins with = + - @
// (or a tab/CR). A customer name saved as `=HYPERLINK("http://evil","x")`
// would therefore run on the machine of whoever opens the export. Prefixing
// a single quote neutralises it while still displaying the original text.
const FORMULA_TRIGGERS = ['=', '+', '-', '@', '\t', '\r'];

const neutralize = (value) => {
  const str = value === null || value === undefined ? '' : String(value);
  return FORMULA_TRIGGERS.includes(str.charAt(0)) ? `'${str}` : str;
};

const quote = (value) => `"${neutralize(value).replace(/"/g, '""')}"`;

export const toCsv = (rows, headers) => {
  if (!Array.isArray(rows) || rows.length === 0) return '';
  const cols = headers && headers.length ? headers : Object.keys(rows[0]);
  return [cols.map(quote).join(','), ...rows.map((r) => cols.map((c) => quote(r[c])).join(','))].join('\r\n');
};

export const downloadCsv = (filename, rows, headers) => {
  const csv = toCsv(rows, headers);
  if (!csv) return false;
  // BOM so Excel opens UTF-8 (Bangla/accented names) correctly.
  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
};