// admin/src/Pages/modules/sales/roles/Admin/BulkImportKamModal.jsx
import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { X, FileSpreadsheet, Download, UploadCloud, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useToast } from '../../../../../Components/hooks/useToast';
import { bulkImportKams } from '../../services/userAdminService';

const CHUNK_SIZE = 25;
const MAX_ROWS = 200;

// The spreadsheet needs only these two columns. Header matching is
// case-insensitive and tolerant of extra spaces, so a file typed by hand
// still works.
const NAME_KEYS = ['name', 'full name', 'kam name', 'employee name'];
const EMAIL_KEYS = ['email', 'e-mail', 'email address', 'mail'];

const pick = (row, keys) => {
  for (const actualKey of Object.keys(row)) {
    if (keys.includes(actualKey.trim().toLowerCase())) {
      const value = row[actualKey];
      if (value !== null && value !== undefined && String(value).trim()) return String(value).trim();
    }
  }
  return '';
};

const BulkImportKamModal = ({ lineManagers, onClose, onImported }) => {
  const { showToast } = useToast();
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [lineManagerId, setLineManagerId] = useState(lineManagers.length === 1 ? lineManagers[0].id : '');
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const lockRef = useRef(false);

  const downloadTemplate = () => {
    const sheet = XLSX.utils.aoa_to_sheet([
      ['Name', 'Email'],
      ['Rahim Uddin', 'rahim.uddin@example.com'],
      ['Karima Akter', 'karima.akter@example.com'],
    ]);
    sheet['!cols'] = [{ wch: 28 }, { wch: 34 }];
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'KAMs');
    XLSX.writeFile(book, 'milex-kam-import-template.xlsx');
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setResult(null);
    try {
      const buffer = await file.arrayBuffer();
      const book = XLSX.read(buffer, { type: 'array' });
      const firstSheet = book.Sheets[book.SheetNames[0]];
      if (!firstSheet) throw new Error('empty');
      const raw = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });

      const parsed = raw
        .map((r) => ({ name: pick(r, NAME_KEYS), email: pick(r, EMAIL_KEYS).toLowerCase() }))
        .filter((r) => r.name || r.email);

      if (parsed.length === 0) {
        return showToast(
          'No rows found. Make sure the first sheet has a "Name" column and an "Email" column.',
          'warning',
          8000
        );
      }
      if (parsed.length > MAX_ROWS) {
        return showToast(`This file has ${parsed.length} rows. Please import at most ${MAX_ROWS} at a time.`, 'warning', 8000);
      }
      setRows(parsed);
      setFileName(file.name);
    } catch {
      showToast("We couldn't read that file. Please use an .xlsx or .csv file.", 'error');
    }
  };

  const handleImport = async () => {
    if (lockRef.current) return;
    if (rows.length === 0) return showToast('Choose a file first', 'warning');
    lockRef.current = true;
    setIsImporting(true);
    setProgress(0);

    const allCreated = [];
    const allSkipped = [];
    try {
      // Sent in small chunks: each account needs its own password hash,
      // which is deliberately slow, so one giant request would time out.
      for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        const chunk = rows.slice(i, i + CHUNK_SIZE);
        // eslint-disable-next-line no-await-in-loop
        const res = await bulkImportKams(chunk, lineManagerId || null);
        allCreated.push(...(res.created || []));
        allSkipped.push(...(res.skipped || []));
        setProgress(Math.min(rows.length, i + chunk.length));
      }
      setResult({ created: allCreated, skipped: allSkipped });
      if (allCreated.length > 0) {
        showToast(`${allCreated.length} Key Account Manager(s) created`, 'success');
        onImported?.();
      } else {
        showToast('No new accounts were created — see the details below.', 'warning');
      }
    } catch (err) {
      showToast(err?.message || 'The import could not be completed.', 'error', 9000);
    } finally {
      lockRef.current = false;
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[88vh] overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center shrink-0">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <FileSpreadsheet size={17} className="text-emerald-600" /> Import KAMs from Excel
          </h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-700 transition">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
            <p className="text-xs text-slate-600 leading-relaxed">
              The spreadsheet needs two columns: <strong>Name</strong> and <strong>Email</strong>.
              Each person is created as a Key Account Manager.
            </p>
            <p className="text-xs text-slate-600 leading-relaxed">
              Their starting password is their own email address. They'll be asked to
              choose a proper password the first time they sign in, so the email is
              never usable as a password beyond that point.
            </p>
            <button
              type="button"
              onClick={downloadTemplate}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:underline"
            >
              <Download size={13} /> Download the template
            </button>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Assign to Line Manager</label>
            {lineManagers.length === 1 ? (
              <>
                <div className="w-full border border-slate-200 bg-slate-50 p-2.5 rounded-lg text-sm text-slate-700 font-medium">
                  {lineManagers[0].name}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Assigned automatically — there is only one Line Manager in the system.
                </p>
              </>
            ) : (
              <select
                className="w-full border border-slate-200 p-2.5 rounded-lg text-sm bg-white outline-none focus:border-emerald-500"
                value={lineManagerId}
                onChange={(e) => setLineManagerId(e.target.value)}
              >
                <option value="">No Line Manager (assign later)</option>
                {lineManagers.map((lm) => (
                  <option key={lm.id} value={lm.id}>{lm.name}</option>
                ))}
              </select>
            )}
          </div>

          <label className="block border-2 border-dashed border-emerald-200 rounded-lg py-5 text-center cursor-pointer hover:bg-emerald-50/50 transition text-xs font-semibold text-emerald-700">
            {fileName ? `${fileName} — ${rows.length} row(s) ready` : 'Click to choose an .xlsx or .csv file'}
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
          </label>

          {rows.length > 0 && !result && (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-50 px-3 py-2 text-[10px] font-bold uppercase text-slate-400 tracking-wide">
                Preview (first 5 of {rows.length})
              </div>
              <div className="divide-y divide-slate-100">
                {rows.slice(0, 5).map((r, i) => (
                  <div key={i} className="px-3 py-2 flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-slate-700 truncate">{r.name || '(missing name)'}</span>
                    <span className="text-slate-400 truncate">{r.email || '(missing email)'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isImporting && (
            <p className="text-xs text-slate-500 text-center">
              Creating accounts… {progress} of {rows.length}
            </p>
          )}

          {result && (
            <div className="space-y-3">
              {result.created.length > 0 && (
                <div className="border border-emerald-200 bg-emerald-50 rounded-lg p-3">
                  <p className="text-xs font-bold text-emerald-800 flex items-center gap-1.5 mb-1.5">
                    <CheckCircle2 size={13} /> {result.created.length} account(s) created
                  </p>
                  <div className="max-h-28 overflow-y-auto space-y-0.5">
                    {result.created.map((c) => (
                      <p key={c.email} className="text-[11px] text-emerald-700 truncate">
                        {c.name} — {c.email}
                      </p>
                    ))}
                  </div>
                </div>
              )}
              {result.skipped.length > 0 && (
                <div className="border border-amber-200 bg-amber-50 rounded-lg p-3">
                  <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5 mb-1.5">
                    <AlertTriangle size={13} /> {result.skipped.length} row(s) skipped
                  </p>
                  <div className="max-h-32 overflow-y-auto space-y-0.5">
                    {result.skipped.map((s, i) => (
                      <p key={`${s.email}-${i}`} className="text-[11px] text-amber-700 break-words">
                        {s.email} — {s.reason}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-5 border-t border-slate-100 flex gap-2 shrink-0">
          <button
            type="button"
            disabled={isImporting || rows.length === 0 || !!result}
            onClick={handleImport}
            className="flex-1 bg-emerald-700 text-white font-bold py-2.5 rounded-lg text-sm shadow-sm hover:bg-emerald-800 transition disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {isImporting ? <Loader2 size={15} className="animate-spin" /> : <UploadCloud size={15} />}
            {result ? 'Import Complete' : `Import ${rows.length || ''} KAM(s)`}
          </button>
          <button type="button" onClick={onClose} className="px-4 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold">
            {result ? 'Close' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkImportKamModal;