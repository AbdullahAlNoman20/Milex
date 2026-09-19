// admin/src/Pages/modules/sales/roles/KAM/WeeklyPlanImportModal.jsx
import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { X, FileSpreadsheet, Download, UploadCloud, Loader2, Users, UserPlus } from 'lucide-react';
import { useToast } from '../../../../../Components/hooks/useToast';
import { searchCustomers } from '../../services/customerService';
import { buildEmptyVisit } from '../../constants/weeklyPlanStatus';

const MAX_ROWS = 200;

// Header matching is case-insensitive and tolerant of spacing, so a sheet
// somebody typed by hand still imports.
const DATE_KEYS = ['date', 'day', 'visit date', 'visiting date'];
const NAME_KEYS = ['customer', 'customer name', 'name', 'client', 'client name'];
const PURPOSE_KEYS = ['purpose', 'visit purpose', 'reason', 'objective'];

const pick = (row, keys) => {
  for (const actualKey of Object.keys(row)) {
    if (keys.includes(actualKey.trim().toLowerCase())) {
      const value = row[actualKey];
      if (value !== null && value !== undefined && String(value).trim()) return value;
    }
  }
  return '';
};

// Excel stores a date as a serial number, but a sheet typed by hand usually
// holds text. Both are normalised to the ISO form the plan works in.
const toIsoDate = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof value === 'number') {
    const parsed = XLSX.SSF?.parse_date_code?.(value);
    if (parsed?.y) {
      return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
    }
  }
  const text = String(value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return '';
};

const WeeklyPlanImportModal = ({ onClose, onImport }) => {
  const { showToast } = useToast();
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [isMatching, setIsMatching] = useState(false);
  const lockRef = useRef(false);

  const downloadTemplate = () => {
    const sheet = XLSX.utils.aoa_to_sheet([
      ['Date', 'Customer Name', 'Purpose'],
      ['2026-09-21', 'Acme Textiles Ltd', 'Quarterly rate review'],
      ['2026-09-22', 'New Prospect Trading', 'Introductory meeting'],
    ]);
    sheet['!cols'] = [{ wch: 14 }, { wch: 32 }, { wch: 40 }];
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Weekly Plan');
    XLSX.writeFile(book, 'milex-weekly-plan-template.xlsx');
  };

  // Whether a visit belongs under Existing Clients or Prospects is decided by
  // the customer list itself, not by the person filling in the sheet — a name
  // that matches an account on file is an existing client by definition.
  const classifyRows = async (parsed) => {
    setIsMatching(true);
    try {
      const uniqueNames = [...new Set(parsed.map((r) => r.customerName.toLowerCase()))];
      const matches = new Map();

      // Looked up a few at a time rather than one after another: a fifty-row
      // sheet would otherwise wait on fifty sequential round trips, which on a
      // slow connection is the difference between a moment and a minute.
      const BATCH = 6;
      for (let i = 0; i < uniqueNames.length; i += BATCH) {
        const slice = uniqueNames.slice(i, i + BATCH);
        const results = await Promise.all(
          slice.map((name) =>
            searchCustomers(name)
              .then((found) => ({ name, found }))
              // A lookup failure just means the row is treated as a prospect.
              .catch(() => ({ name, found: [] }))
          )
        );
        results.forEach(({ name, found }) => {
          const exact = (found || []).find(
            (c) => (c.accountName || '').trim().toLowerCase() === name
          );
          if (exact) matches.set(name, exact);
        });
      }

      return parsed.map((r) => {
        const match = matches.get(r.customerName.toLowerCase());
        return {
          ...r,
          customerId: match?.id || null,
          section: match ? 'existing' : 'prospect',
          matchedName: match?.accountName || null,
        };
      });
    } finally {
      setIsMatching(false);
    }
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const book = XLSX.read(buffer, { type: 'array', cellDates: true });
      const firstSheet = book.Sheets[book.SheetNames[0]];
      if (!firstSheet) throw new Error('empty');
      const raw = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });

      const parsed = raw
        .map((r) => ({
          day: toIsoDate(pick(r, DATE_KEYS)),
          customerName: String(pick(r, NAME_KEYS) || '').trim(),
          purpose: String(pick(r, PURPOSE_KEYS) || '').trim(),
        }))
        .filter((r) => r.customerName);

      if (parsed.length === 0) {
        return showToast(
          'No rows found. The first sheet needs a Date column, a Customer Name column and a Purpose column.',
          'warning',
          8000
        );
      }
      if (parsed.length > MAX_ROWS) {
        return showToast(`This file has ${parsed.length} rows. Please import at most ${MAX_ROWS} at a time.`, 'warning', 8000);
      }

      const incomplete = parsed.filter((r) => !r.day || !r.purpose);
      if (incomplete.length > 0) {
        showToast(
          `${incomplete.length} row(s) are missing a date or a purpose and will be skipped.`,
          'warning',
          7000
        );
      }

      const usable = parsed.filter((r) => r.day && r.purpose);
      if (usable.length === 0) {
        return showToast('Every row is missing a date or a purpose — nothing to import.', 'warning');
      }

      setFileName(file.name);
      setRows(await classifyRows(usable));
    } catch {
      showToast("We couldn't read that file. Please use an .xlsx or .csv file.", 'error');
    }
  };

  const handleImport = () => {
    if (lockRef.current || rows.length === 0) return;
    lockRef.current = true;
    const existing = rows
      .filter((r) => r.section === 'existing')
      .map((r) => ({ ...buildEmptyVisit(r.day), customerName: r.matchedName || r.customerName, customerId: r.customerId, purpose: r.purpose }));
    const prospect = rows
      .filter((r) => r.section === 'prospect')
      .map((r) => ({ ...buildEmptyVisit(r.day), customerName: r.customerName, customerId: null, purpose: r.purpose }));
    onImport({ existing, prospect });
  };

  const existingCount = rows.filter((r) => r.section === 'existing').length;
  const prospectCount = rows.length - existingCount;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[88vh] overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center shrink-0">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <FileSpreadsheet size={17} className="text-emerald-600" /> Import Weekly Plan
          </h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-700 transition">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
            <p className="text-xs text-slate-600 leading-relaxed">
              The sheet needs three columns: <strong>Date</strong>, <strong>Customer Name</strong> and{' '}
              <strong>Purpose</strong>. Each row becomes one planned visit on that date.
            </p>
            <p className="text-xs text-slate-600 leading-relaxed">
              Names are checked against your customer list: anyone already on file is filed under
              Existing Clients, everyone else under Prospects. You don't have to mark that yourself.
            </p>
            <button
              type="button"
              onClick={downloadTemplate}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:underline"
            >
              <Download size={13} /> Download the template
            </button>
          </div>

          <label className="block border-2 border-dashed border-emerald-200 rounded-lg py-5 text-center cursor-pointer hover:bg-emerald-50/50 transition text-xs font-semibold text-emerald-700">
            {fileName ? `${fileName} — ${rows.length} visit(s) ready` : 'Click to choose an .xlsx or .csv file'}
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
          </label>

          {isMatching && (
            <p className="text-xs text-slate-500 text-center flex items-center justify-center gap-2">
              <Loader2 size={13} className="animate-spin" /> Checking names against your customer list…
            </p>
          )}

          {rows.length > 0 && !isMatching && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-[10px] font-bold uppercase text-emerald-700 flex items-center gap-1">
                    <Users size={11} /> Existing
                  </p>
                  <p className="text-xl font-bold text-emerald-800">{existingCount}</p>
                </div>
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <p className="text-[10px] font-bold uppercase text-blue-700 flex items-center gap-1">
                    <UserPlus size={11} /> Prospects
                  </p>
                  <p className="text-xl font-bold text-blue-800">{prospectCount}</p>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-3 py-2 text-[10px] font-bold uppercase text-slate-400 tracking-wide">
                  Preview (first 6 of {rows.length})
                </div>
                <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {rows.slice(0, 6).map((r, i) => (
                    <div key={i} className="px-3 py-2 flex items-start justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-700 truncate">
                          {r.matchedName || r.customerName}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {r.day} · {r.purpose}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          r.section === 'existing'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-blue-50 text-blue-700'
                        }`}
                      >
                        {r.section}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="p-5 border-t border-slate-100 flex gap-2 shrink-0">
          <button
            type="button"
            disabled={rows.length === 0 || isMatching}
            onClick={handleImport}
            className="flex-1 bg-emerald-700 text-white font-bold py-2.5 rounded-lg text-sm shadow-sm hover:bg-emerald-800 transition disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            <UploadCloud size={15} /> Add {rows.length || ''} Visit(s) to This Week
          </button>
          <button type="button" onClick={onClose} className="px-4 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default WeeklyPlanImportModal;