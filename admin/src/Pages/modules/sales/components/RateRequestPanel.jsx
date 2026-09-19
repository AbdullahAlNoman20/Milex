// admin/src/Pages/modules/sales/components/RateRequestPanel.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { TrendingDown, Send, CheckCircle, XCircle, Loader2, History } from 'lucide-react';
import { listRateRequests, createRateRequest, decideRateRequest } from '../services/rateRequestService';
import { useToast } from '../../../../Components/hooks/useToast';
import { useConfirm } from '../../../../Components/hooks/useConfirm';
import { useAuth } from '../../../../Components/hooks/useAuth';
import { ROLES } from '../../../../Components/constants/roles';
import { rateSourceLabel } from '../../../../Components/utils/format';
import RateHistoryModal from './RateHistoryModal';

// Deliberately available at every stage, including on a long-since-active
// account: a customer can ask for a better rate whenever they like, and the
// request has to have somewhere to go when they do.
const RateRequestPanel = ({ customer, onUpdated, reloadToken = 0 }) => {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const { currentUser } = useAuth();
  const [items, setItems] = useState([]);
  const [reason, setReason] = useState('');
  const [grantedRate, setGrantedRate] = useState('');
  const [grantedNote, setGrantedNote] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const lockRef = useRef(false);

  const role = currentUser?.role;
  // The Sales Coordinator handles correspondence, not commercial terms — a
  // rate request comes from whoever owns the customer relationship.
  const canRequest = [ROLES.KAM, ROLES.LINE_MANAGER, ROLES.HEAD_OF_DEPARTMENT, ROLES.SUPER_ADMIN].includes(role);
  const canGrant = [ROLES.HEAD_OF_DEPARTMENT, ROLES.SUPER_ADMIN].includes(role);
  const isReadOnlyViewer = !canRequest && !canGrant;

  const load = useCallback(() => {
    listRateRequests(customer.id)
      .then(setItems)
      .catch(() => setItems([]));
  }, [customer.id]);

  // The customer's own revision counter moves every time a rate changes, so
  // it doubles as the signal that this list is out of date — without it the
  // panel kept showing a request that had already been answered elsewhere.
  useEffect(() => {
    load();
  }, [load, reloadToken, customer.revision, customer.approvedRate]);

  const open = items.find((r) => r.approved === null) || null;
  const answered = items.filter((r) => r.approved !== null);

  const submitRequest = async () => {
    if (lockRef.current) return;
    if (!reason.trim()) return showToast('Please say why a different rate is needed', 'warning');
    const ok = await confirm({
      title: 'Send this rate request?',
      message: 'The Head of Department will be asked to set a new best rate for this customer.',
      confirmLabel: 'Send request',
    });
    if (!ok) return;
    lockRef.current = true;
    setIsBusy(true);
    try {
      await createRateRequest(customer.id, reason.trim(), !!customer.offerRejected);
      showToast('Rate request sent to the Head of Department', 'success');
      setReason('');
      load();
      onUpdated?.();
    } catch (err) {
      showToast(err?.message || 'Could not send the request', 'error');
    } finally {
      lockRef.current = false;
      setIsBusy(false);
    }
  };

  const decide = async (approve) => {
    if (lockRef.current) return;
    if (approve && !grantedRate.trim()) return showToast('Enter the rate you are granting', 'warning');
    const ok = await confirm({
      title: approve ? 'Grant this rate?' : 'Decline this request?',
      message: approve
        ? 'This replaces the rate currently in force and everyone involved will be told it came from you.'
        : 'The existing rate will stand and the person who asked will be notified.',
      confirmLabel: approve ? 'Grant rate' : 'Decline',
      tone: approve ? 'default' : 'danger',
    });
    if (!ok) return;
    lockRef.current = true;
    setIsBusy(true);
    try {
      await decideRateRequest(open.id, {
        approve,
        grantedRate: approve ? grantedRate.trim() : undefined,
        grantedNote: grantedNote.trim() || undefined,
      });
      showToast(approve ? 'New rate set' : 'Request declined', 'success');
      setGrantedRate('');
      setGrantedNote('');
      load();
      onUpdated?.();
    } catch (err) {
      showToast(err?.message || 'Could not record the decision', 'error');
    } finally {
      lockRef.current = false;
      setIsBusy(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold text-slate-900 text-sm flex items-center">
            Rate
          </h3>
          <button
            type="button"
            onClick={() => setIsHistoryOpen(true)}
            title="See every rate this customer has been given"
            className="text-slate-400 hover:text-indigo-600 transition inline-flex items-center gap-1 text-[11px] font-bold"
          >
            <History size={14} /> History
          </button>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
            Current Rate
          </p>
          <p className="text-sm font-bold text-slate-800 break-words">
            {customer.approvedRate || customer.proposedRate || '—'}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Given by: <strong>{rateSourceLabel(customer.rateSource)}</strong>
          </p>
        </div>

        {open ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700">
              Awaiting a new best rate
            </p>
            <p className="text-xs text-slate-700 break-words">{open.reason}</p>
            <p className="text-[10px] text-slate-400">
              Requested {new Date(open.createdAt).toLocaleString()}
            </p>

            {canGrant && (
              <div className="pt-2 space-y-2 border-t border-amber-200">
                <textarea
                  className="w-full border border-slate-300 p-2 rounded text-xs outline-none focus:border-emerald-500 min-h-[60px]"
                  placeholder="New rate to grant"
                  value={grantedRate}
                  maxLength={300}
                  onChange={(e) => setGrantedRate(e.target.value)}
                />
                <input
                  className="w-full border border-slate-300 p-2 rounded text-xs outline-none focus:border-emerald-500"
                  placeholder="Note (optional)"
                  value={grantedNote}
                  maxLength={1000}
                  onChange={(e) => setGrantedNote(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => decide(true)}
                    className="bg-emerald-600 text-white text-xs font-bold py-2 rounded flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    {isBusy ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />} Grant
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => decide(false)}
                    className="bg-white border border-red-300 text-red-500 text-xs font-bold py-2 rounded flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    <XCircle size={12} /> Decline
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          canRequest && (
            <div className="space-y-2">
              <textarea
                className="w-full border border-slate-300 p-2 rounded text-xs outline-none focus:border-emerald-500 min-h-[60px]"
                value={reason}
                maxLength={1000}
                onChange={(e) => setReason(e.target.value)}
              />
              <button
                type="button"
                disabled={isBusy}
                onClick={submitRequest}
                className="w-full bg-indigo-600 text-white text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {isBusy ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                Request a New Best Rate
              </button>
            </div>
          )
        )}

        {isReadOnlyViewer && !open && (
          <p className="text-[11px] text-slate-400">
            Rate changes are raised by the customer's Key Account Manager or their Line Manager.
          </p>
        )}

        {answered.length > 0 && (
          <div className="pt-2 border-t border-slate-100 space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Past Requests
            </p>
            {answered.slice(0, 4).map((r) => (
              <div key={r.id} className="text-[11px] flex items-start justify-between gap-2">
                <span className={r.approved ? 'text-emerald-700' : 'text-red-600'}>
                  {r.approved ? `Granted: ${r.grantedRate}` : 'Declined'}
                  {r.approved && r.grantedByRole && (
                    <span className="text-slate-400"> · {rateSourceLabel(r.grantedByRole)}</span>
                  )}
                </span>
                <span className="text-slate-400 shrink-0">
                  {r.grantedAt ? new Date(r.grantedAt).toLocaleDateString() : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {isHistoryOpen && <RateHistoryModal customer={customer} onClose={() => setIsHistoryOpen(false)} />}
    </>
  );
};

export default RateRequestPanel;