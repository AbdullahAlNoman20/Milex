// admin/src/Pages/modules/sales/roles/HOD/HodRatePanel.jsx
import { useState, useRef } from 'react';
import { CheckCircle, Loader2, FileOutput } from 'lucide-react';
import { grantHodRate, getDocumentSignedUrl } from '../../services/customerService';
import { useToast } from '../../../../../Components/hooks/useToast';
import { useConfirm } from '../../../../../Components/hooks/useConfirm';
import { isRequired } from '../../../../../Components/utils/validators';
import { rateSourceLabel, humanizeStatus } from '../../../../../Components/utils/format';

// The field opens pre-filled with the rate currently in force, because the
// answer is almost always an adjustment of it rather than a number pulled
// from nowhere. What it replaced is listed above, so the whole sequence is
// visible while the decision is being made.
const HodRatePanel = ({ customer, onUpdated }) => {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [newRate, setNewRate] = useState(customer.approvedRate || customer.proposedRate || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpeningRateDoc, setIsOpeningRateDoc] = useState(false);
  const lockRef = useRef(false);

  // The same supporting document the Line Manager sees. It is the only thing
  // on the record that shows where the KAM's figure came from, so it has to
  // travel with the request all the way up.
  const rateDocument = (customer.documents || []).find(
    (d) => d.documentType === 'RECOMMENDATION_ATTACHMENT'
  );

  const handleOpenRateDocument = async () => {
    if (!rateDocument) {
      return showToast('The KAM did not attach a rate document to this recommendation.', 'warning');
    }
    if (rateDocument.scanStatus !== 'CLEAN') {
      return showToast('This file is still being checked — try again shortly', 'warning');
    }
    setIsOpeningRateDoc(true);
    try {
      const url = await getDocumentSignedUrl(rateDocument.storageKey);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      showToast(err?.message || 'Could not open the rate document', 'error');
    } finally {
      setIsOpeningRateDoc(false);
    }
  };

  // Newest first — the rate just superseded is the one that matters most.
  const history = [...(customer.rateHistory || [])].sort((a, b) => {
    const at = a.changedAt ? new Date(a.changedAt).getTime() : 0;
    const bt = b.changedAt ? new Date(b.changedAt).getTime() : 0;
    return bt - at;
  });

  const handleGrant = async () => {
    if (lockRef.current) return;
    if (!isRequired(newRate)) return showToast('Enter the rate you are setting', 'warning');

    const ok = await confirm({
      title: 'Set this as the best rate?',
      message: `${customer.accountName} will be quoted ${newRate.trim()}. The KAM and their Line Manager are told it came from you.`,
      confirmLabel: 'Set rate',
    });
    if (!ok) return;

    lockRef.current = true;
    setIsSubmitting(true);
    try {
      await grantHodRate(customer.id, newRate.trim());
      showToast('Best rate set', 'success');
      onUpdated?.();
    } catch (err) {
      showToast(err?.message || 'Could not set the rate', 'error');
    } finally {
      lockRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-indigo-400 p-6 space-y-4">
      <h3 className="font-bold text-slate-900 text-base">Best Rate Requested</h3>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
          KAM'S PROPOSED RATE
        </p>
        <p className="font-bold text-sm text-slate-800 mb-2 break-words">
          {customer.proposedRate || '—'}
        </p>
        <button
          type="button"
          onClick={handleOpenRateDocument}
          disabled={isOpeningRateDoc}
          className="text-xs text-blue-600 font-bold flex items-center justify-center w-full hover:underline disabled:opacity-50"
        >
          {isOpeningRateDoc ? (
            <Loader2 size={14} className="mr-1 animate-spin" />
          ) : (
            <FileOutput size={14} className="mr-1" />
          )}
          {rateDocument ? 'Open Attached Rate Document' : 'No Rate Document Attached'}
        </button>
      </div>

      <div className="space-y-2">
        {history.map((h, i) => (
          <div key={i} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-0.5">
              {/* The time matters as much as the day once a rate has gone round
                  two or three times in the same afternoon. */}
              Replaced {h.changedAt ? new Date(h.changedAt).toLocaleString() : ''} ·{' '}
              {rateSourceLabel(h.source)}
            </p>
            <p className="text-xs text-slate-600 break-words line-through decoration-slate-300">
              {h.rate || '—'}
            </p>
            {h.reason && <p className="text-[10px] text-red-600 mt-1 break-words">{h.reason}</p>}
          </div>
        ))}

        {customer.approvedRate && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700 mb-0.5">
              Current rate · {rateSourceLabel(customer.rateSource)}
            </p>
            <p className="text-xs font-semibold text-slate-800 break-words">{customer.approvedRate}</p>
          </div>
        )}
      </div>

      {/* The question actually addressed to this desk. It is the open request
          on the record — the Line Manager's own words when they passed it up,
          not the KAM's earlier ask, which was closed out at that moment. */}
      {customer.pendingRateRequest?.reason ? (
        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-700 mb-1">
            {customer.pendingRateRequest.requestedByName || 'Requested'}
            {customer.pendingRateRequest.requestedByRole
              ? ` (${humanizeStatus(customer.pendingRateRequest.requestedByRole)})`
              : ''}{' '}
            asked for a best rate
          </p>
          <p className="text-xs text-slate-700 break-words">{customer.pendingRateRequest.reason}</p>
          <p className="text-[10px] text-slate-400 mt-1">
            {new Date(customer.pendingRateRequest.createdAt).toLocaleString()}
          </p>
        </div>
      ) : (
        customer.lmNote && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-700 mb-1">
              Line Manager's Reason
            </p>
            <p className="text-xs text-slate-700 break-words">{customer.lmNote}</p>
          </div>
        )
      )}

      <div>
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
          Best Rate
        </label>
        <textarea
          className="w-full text-xs border border-slate-300 p-3 rounded-lg outline-none focus:border-indigo-500 min-h-[80px]"
          placeholder="e.g. 28 USD/Kg + 10 USD Custom"
          value={newRate}
          maxLength={300}
          onChange={(e) => setNewRate(e.target.value)}
        />
        <p className="text-[10px] text-slate-400 mt-1">
          Pre-filled with the current rate — edit it to whatever you are granting.
        </p>
      </div>

      {/* The message field has been removed: the rate itself is the decision,
          and everyone involved is already told who set it. */}

      <button
        type="button"
        disabled={isSubmitting}
        onClick={handleGrant}
        className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl flex justify-center items-center text-sm shadow hover:bg-indigo-700 transition disabled:opacity-50"
      >
        {isSubmitting ? (
          <Loader2 size={16} className="mr-1.5 animate-spin" />
        ) : (
          <CheckCircle size={16} className="mr-1.5" />
        )}
        Set Best Rate
      </button>
    </div>
  );
};

export default HodRatePanel;