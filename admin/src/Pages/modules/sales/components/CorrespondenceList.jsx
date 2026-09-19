// admin/src/Pages/modules/sales/components/CorrespondenceList.jsx
import { useState, useEffect } from 'react';
import { Mail, FileSignature, Eye, X, Loader2, Printer } from 'lucide-react';
import { listCorrespondence } from '../services/customerService';

const KIND_META = {
  OFFER_LETTER: { label: 'Offer Letter', icon: Mail, tone: 'text-emerald-600' },
  AGREEMENT: { label: 'Agreement', icon: FileSignature, tone: 'text-blue-600' },
};

const SENT_VIA_LABEL = {
  MAIL: 'Sent by email',
  HARD_COPY: 'Printed & sent as hard copy',
};

// Reading one exact copy, as it was worded at the time.
const CopyViewer = ({ entry, onClose }) => {
  const meta = KIND_META[entry.kind] || KIND_META.OFFER_LETTER;
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-100 flex justify-between items-start gap-3 shrink-0">
          <div className="min-w-0">
            <h3 className="font-bold text-slate-800 text-sm">
              {meta.label} — Copy {entry.copyNumber}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {new Date(entry.createdAt).toLocaleString()}
              {entry.sentVia ? ` · ${SENT_VIA_LABEL[entry.sentVia] || entry.sentVia}` : ''}
            </p>
            {entry.rateAtSend && (
              <p className="text-[11px] text-slate-600 mt-1 break-words">
                Rate quoted: <strong>{entry.rateAtSend}</strong>
                {entry.rateRef ? ` (REF-${entry.rateRef})` : ''}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => window.print()}
              aria-label="Print this copy"
              className="text-slate-400 hover:text-slate-700 transition"
            >
              <Printer size={16} />
            </button>
            <button type="button" onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-700 transition">
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 p-5">
          <pre className="whitespace-pre-wrap break-words font-sans text-sm text-slate-700 leading-relaxed">
            {entry.body}
          </pre>
        </div>
      </div>
    </div>
  );
};

// A customer who sends an offer back two or three times ends up with several
// letters, and the record only keeps the newest wording on the account
// itself. This is the full set, numbered in the order they went out, so the
// question "what did we actually quote them in March" has an answer.
// A customer who sends an offer back two or three times ends up with several
// letters, and the record only keeps the newest wording on the account
// itself. This is the full set, numbered in the order they went out.
const CorrespondenceList = ({ customerId, reloadToken = 0 }) => {
  // One piece of state describes the whole fetch, so the effect writes once
  // when the response lands rather than flipping a flag on the way in too.
  const [result, setResult] = useState({ key: null, items: [] });
  const [viewing, setViewing] = useState(null);

  const requestKey = `${customerId}:${reloadToken}`;
  const isLoading = result.key !== requestKey;
  const items = isLoading ? [] : result.items;

  useEffect(() => {
    let cancelled = false;
    listCorrespondence(customerId)
      .then((data) => {
        if (!cancelled) setResult({ key: requestKey, items: Array.isArray(data) ? data : [] });
      })
      .catch(() => {
        if (!cancelled) setResult({ key: requestKey, items: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [customerId, requestKey]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center gap-2 text-xs text-slate-400">
        <Loader2 size={14} className="animate-spin" /> Loading sent letters…
      </div>
    );
  }

  if (items.length === 0) return null;

  const offers = items.filter((i) => i.kind === 'OFFER_LETTER');
  const agreements = items.filter((i) => i.kind === 'AGREEMENT');

  const renderGroup = (group) => {
    if (group.length === 0) return null;
    const meta = KIND_META[group[0].kind] || KIND_META.OFFER_LETTER;
    const Icon = meta.icon;
    return (
      <div key={group[0].kind} className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          {meta.label} — {group.length} copy{group.length === 1 ? '' : ' set'}
        </p>
        {group.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center justify-between gap-3 text-xs bg-slate-50 border border-slate-200 rounded-lg p-3"
          >
            <div className="min-w-0 flex items-start gap-2">
              <Icon size={14} className={`${meta.tone} shrink-0 mt-0.5`} />
              <div className="min-w-0">
                <p className="font-bold text-slate-800">
                  {meta.label} — Copy {entry.copyNumber}
                </p>
                <p className="text-slate-500 text-[11px]">
                  {new Date(entry.createdAt).toLocaleString()}
                  {entry.sentVia ? ` · ${SENT_VIA_LABEL[entry.sentVia] || entry.sentVia}` : ''}
                </p>
                {entry.rateAtSend && (
                  <p className="text-slate-400 text-[10px] mt-0.5 truncate">
                    Rate: {entry.rateAtSend}
                    {entry.rateRef ? ` · REF-${entry.rateRef}` : ''}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setViewing(entry)}
              className="shrink-0 flex items-center gap-1.5 text-emerald-700 font-bold bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded hover:bg-emerald-100 transition"
            >
              <Eye size={12} /> Read
            </button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
        <div>
          <h3 className="font-bold text-slate-900 text-base">Sent Correspondence</h3>
          <p className="text-xs text-slate-500 mt-1">
            Every offer letter and agreement sent to this customer, kept in the order they went out.
          </p>
        </div>
        {renderGroup(offers)}
        {renderGroup(agreements)}
      </div>

      {viewing && <CopyViewer entry={viewing} onClose={() => setViewing(null)} />}
    </>
  );
};

export default CorrespondenceList;