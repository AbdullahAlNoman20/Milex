// admin/src/Pages/modules/sales/components/RateRequestPanel.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { Send, CheckCircle, XCircle, Loader2, History, ArrowUpCircle, Lock } from 'lucide-react';
import {
  listRateRequests,
  createRateRequest,
  decideNewRate,
  ownerDecideNewRate,
} from '../services/rateRequestService';
import { useToast } from '../../../../Components/hooks/useToast';
import { useConfirm } from '../../../../Components/hooks/useConfirm';
import { useAuth } from '../../../../Components/hooks/useAuth';
import { ROLES } from '../../../../Components/constants/roles';
import { rateSourceLabel, humanizeStatus } from '../../../../Components/utils/format';
import { RATE_PROCESS_STAGE } from '../constants/salesStatus';
import RateHistoryModal from './RateHistoryModal';

// Declared at module scope. Defining a component inside the render body
// recreates it on every pass, which resets any state it holds and is exactly
// what the hooks lint forbids.
const CurrentRate = ({ customer }) => (
  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Current Rate</p>
    <p className="text-sm font-bold text-slate-800 break-words">
      {customer.approvedRate || customer.proposedRate || '—'}
    </p>
    <p className="text-[11px] text-slate-500 mt-1">
      Given by: <strong>{rateSourceLabel(customer.rateSource)}</strong>
    </p>
  </div>
);

const OpenRequestNote = ({ request }) =>
  request ? (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
      <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700">
        Asked for by {humanizeStatus(request.requestedByRole)}
      </p>
      <p className="text-xs text-slate-700 break-words">{request.reason}</p>
      <p className="text-[10px] text-slate-400">{new Date(request.createdAt).toLocaleString()}</p>
    </div>
  ) : null;

const Locked = ({ children }) => (
  <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex items-start gap-2">
    <Lock size={12} className="shrink-0 mt-0.5 text-slate-400" />
    <span>{children}</span>
  </p>
);

// A live customer asking for new terms runs the same desks as the original
// recommendation — Line Manager, Head of Department, the account's holder,
// the Sales Coordinator, the customer — one step at a time, without the
// account's own standing changing at any point. This panel is the rate half
// of that; the offer and feedback halves appear in the action panel above.
//
// Nothing new can be started while a rate is still travelling. Once the
// customer has answered, the account is idle again and the next request can
// be raised.
const RateRequestPanel = ({ customer, onUpdated, reloadToken = 0 }) => {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const { currentUser } = useAuth();
  const [items, setItems] = useState([]);
  const [reason, setReason] = useState('');
  // The field opens on the rate in force, because the answer is almost always
  // an adjustment of it rather than a number pulled from nowhere. Whatever has
  // been typed is kept while the record is unchanged, and re-seeded the moment
  // the rate itself moves — React's own way of adjusting state to a prop,
  // which needs a second piece of state rather than a ref or an effect.
  const currentRate = customer.approvedRate || customer.proposedRate || '';
  const [newRate, setNewRate] = useState(currentRate);
  const [seededRate, setSeededRate] = useState(currentRate);
  if (seededRate !== currentRate) {
    setSeededRate(currentRate);
    setNewRate(currentRate);
  }
  const [escalateMode, setEscalateMode] = useState(false);
  const [escalateReason, setEscalateReason] = useState('');
  const [reviewMode, setReviewMode] = useState('send');
  const [reviewReason, setReviewReason] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const lockRef = useRef(false);

  const role = currentUser?.role;
  const stage = customer.rateProcessStage || null;
  const isLineManager = role === ROLES.LINE_MANAGER;
  const isHod = role === ROLES.HEAD_OF_DEPARTMENT || role === ROLES.SUPER_ADMIN;
  // A Line Manager and the Head of Department both set rates outright; the
  // Sales Coordinator handles correspondence, not commercial terms.
  const canSetRate = isLineManager || isHod;
  const canRequest = role === ROLES.KAM || canSetRate;
  const isAccountOwner = customer.handledById === currentUser?.id;

  const load = useCallback(() => {
    listRateRequests(customer.id)
      .then(setItems)
      .catch(() => setItems([]));
  }, [customer.id]);

  // The customer's own revision counter moves every time a rate changes, so
  // it doubles as the signal that this list is out of date.
  useEffect(() => {
    load();
  }, [load, reloadToken, customer.revision, customer.approvedRate, stage]);

  const open = items.find((r) => r.approved === null) || null;
  const answered = items.filter((r) => r.approved !== null);

  const run = async (fn, successMessage) => {
    if (lockRef.current) return;
    lockRef.current = true;
    setIsBusy(true);
    try {
      await fn();
      showToast(successMessage, 'success');
      setReason('');
      setEscalateReason('');
      setReviewReason('');
      setEscalateMode(false);
      load();
      onUpdated?.();
    } catch (err) {
      showToast(err?.message || 'That could not be completed', 'error');
    } finally {
      lockRef.current = false;
      setIsBusy(false);
    }
  };

  const submitRequest = async () => {
    if (!reason.trim()) return showToast('Please say why a different rate is needed', 'warning');
    const ok = await confirm({
      title: 'Send this rate request?',
      message: 'Your Line Manager will either set a new rate or take it up to the Head of Department.',
      confirmLabel: 'Send request',
    });
    if (!ok) return;
    run(
      () => createRateRequest(customer.id, reason.trim(), !!customer.offerRejected),
      'Rate request sent to your Line Manager'
    );
  };

  const setRate = async () => {
    if (!newRate.trim()) return showToast('Enter the rate you are setting', 'warning');
    const ok = await confirm({
      title: 'Set this as the new rate?',
      message: `${customer.accountName} will be quoted ${newRate.trim()}. This replaces the rate currently in force and everyone involved is told it came from you.`,
      confirmLabel: 'Yes, set this rate',
      cancelLabel: 'No, go back',
    });
    if (!ok) return;
    run(() => decideNewRate(customer.id, { action: 'SET', approvedRate: newRate.trim() }), 'New rate set');
  };

  const escalate = async () => {
    if (!escalateReason.trim()) return showToast('Say what you need from the Head of Department', 'warning');
    const ok = await confirm({
      title: 'Ask the Head of Department for a best rate?',
      message: 'The decision passes to them. Nothing reaches the customer until they answer.',
      confirmLabel: 'Send request',
    });
    if (!ok) return;
    run(
      () => decideNewRate(customer.id, { action: 'ESCALATE', reason: escalateReason.trim() }),
      'Sent to the Head of Department'
    );
  };

  const decline = async () => {
    const ok = await confirm({
      title: 'Decline this request?',
      message: 'The existing rate will stand and the person who asked will be notified.',
      confirmLabel: 'Decline',
      tone: 'danger',
    });
    if (!ok) return;
    run(() => decideNewRate(customer.id, { action: 'DECLINE' }), 'Request declined');
  };

  const ownerAccept = async () => {
    const ok = await confirm({
      title: 'Send this rate for an offer letter?',
      message: `The Sales Coordinator will prepare and send the offer letter to ${customer.accountName} at this rate.`,
      confirmLabel: 'Send to Sales Coordinator',
    });
    if (!ok) return;
    run(() => ownerDecideNewRate(customer.id, { accept: true }), 'Sent to the Sales Coordinator');
  };

  const ownerAskAgain = async () => {
    if (!reviewReason.trim()) return showToast('Explain why a better rate is needed', 'warning');
    run(
      () => ownerDecideNewRate(customer.id, { accept: false, reason: reviewReason.trim() }),
      'Sent back for a better rate'
    );
  };

  const renderBody = () => {
    // The rate is on the table and nothing has reached the customer — the
    // person holding the account decides what happens to it.
    if (stage === RATE_PROCESS_STAGE.PENDING_OWNER_REVIEW) {
      if (!isAccountOwner && role !== ROLES.SUPER_ADMIN) {
        return (
          <Locked>
            Waiting for {customer.handledBy?.name || 'the account holder'} to decide whether this rate goes to the
            customer.
          </Locked>
        );
      }
      return (
        <div className="space-y-3">
          <div className="flex gap-1 border-b border-slate-200">
            <button
              type="button"
              onClick={() => setReviewMode('send')}
              className={`px-3 py-2 text-[11px] font-bold border-b-2 -mb-px transition ${
                reviewMode === 'send' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-400'
              }`}
            >
              Send for Offer Letter
            </button>
            <button
              type="button"
              onClick={() => setReviewMode('again')}
              className={`px-3 py-2 text-[11px] font-bold border-b-2 -mb-px transition ${
                reviewMode === 'again' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-400'
              }`}
            >
              Ask Again
            </button>
          </div>
          {reviewMode === 'send' ? (
            <button
              type="button"
              disabled={isBusy}
              onClick={ownerAccept}
              className="w-full bg-emerald-700 text-white text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isBusy ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Send to Sales Coordinator
            </button>
          ) : (
            <>
              <textarea
                className="w-full border border-slate-300 p-2 rounded text-xs outline-none focus:border-indigo-500 min-h-[60px]"
                placeholder="Why is a better rate needed?"
                value={reviewReason}
                maxLength={1000}
                onChange={(e) => setReviewReason(e.target.value)}
              />
              <button
                type="button"
                disabled={isBusy}
                onClick={ownerAskAgain}
                className="w-full bg-indigo-600 text-white text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isBusy ? <Loader2 size={13} className="animate-spin" /> : <ArrowUpCircle size={13} />} Ask for a Better
                Rate
              </button>
            </>
          )}
        </div>
      );
    }

    // The rate has left the desks and is on its way to the customer. Nothing
    // may be changed or started until they have answered — a second figure
    // raised now would replace the one they are being quoted.
    if (stage === RATE_PROCESS_STAGE.PENDING_OFFER) {
      return (
        <Locked>
          The Sales Coordinator is sending the offer letter for this rate. Another rate can be raised once the customer
          has answered it.
        </Locked>
      );
    }
    if (stage === RATE_PROCESS_STAGE.AWAITING_FEEDBACK) {
      return (
        <Locked>
          The customer is considering this rate. Another rate can be raised once they have answered.
        </Locked>
      );
    }

    const awaitingHod = stage === RATE_PROCESS_STAGE.PENDING_HOD_RATE;
    if (awaitingHod && !isHod) {
      return <Locked>Passed to the Head of Department — waiting for them to set the best rate.</Locked>;
    }

    // Idle, or sitting on this person's own desk. Either way a Line Manager
    // and the Head of Department set the rate here rather than asking anyone
    // for it; only a KAM raises a request.
    if (canSetRate) {
      return (
        <div className="space-y-3">
          {isLineManager && !awaitingHod && (
            <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={escalateMode}
                onChange={(e) => setEscalateMode(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Request the best rate from the Head of Department instead
            </label>
          )}

          {escalateMode ? (
            <>
              <textarea
                className="w-full border border-slate-300 p-2 rounded text-xs outline-none focus:border-indigo-500 min-h-[60px]"
                placeholder="What do you need from the Head of Department?"
                value={escalateReason}
                maxLength={1000}
                onChange={(e) => setEscalateReason(e.target.value)}
              />
              <button
                type="button"
                disabled={isBusy}
                onClick={escalate}
                className="w-full bg-indigo-600 text-white text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isBusy ? <Loader2 size={13} className="animate-spin" /> : <ArrowUpCircle size={13} />} Send to Head of
                Department
              </button>
            </>
          ) : (
            <>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  New Rate
                </label>
                <textarea
                  className="w-full border border-slate-300 p-2 rounded text-xs outline-none focus:border-emerald-500 min-h-[60px]"
                  placeholder="e.g. 28 USD/Kg + 10 USD Custom"
                  value={newRate}
                  maxLength={300}
                  onChange={(e) => setNewRate(e.target.value)}
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Pre-filled with the rate currently in force — edit it to whatever you are setting.
                </p>
              </div>
              <div className={open ? 'grid grid-cols-2 gap-2' : ''}>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={setRate}
                  className="w-full bg-emerald-600 text-white text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isBusy ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />} Set New Rate
                </button>
                {open && (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={decline}
                    className="w-full bg-white border border-red-300 text-red-500 text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <XCircle size={13} /> Decline
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      );
    }

    if (open) {
      return (
        <Locked>Waiting for the Line Manager to set a new rate or pass it to the Head of Department.</Locked>
      );
    }

    if (canRequest) {
      return (
        <div className="space-y-2">
          <textarea
            className="w-full border border-slate-300 p-2 rounded text-xs outline-none focus:border-emerald-500 min-h-[60px]"
            placeholder="Why does this customer need a different rate?"
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
      );
    }

    return (
      <p className="text-[11px] text-slate-400">
        Rate changes are raised by the customer's Key Account Manager or their Line Manager.
      </p>
    );
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold text-slate-900 text-sm">Rate</h3>
          <button
            type="button"
            onClick={() => setIsHistoryOpen(true)}
            title="See every rate this customer has been given"
            className="text-slate-400 hover:text-indigo-600 transition inline-flex items-center gap-1 text-[11px] font-bold"
          >
            <History size={14} /> History
          </button>
        </div>

        <CurrentRate customer={customer} />
        <OpenRequestNote request={open} />
        {renderBody()}

        {answered.length > 0 && (
          <div className="pt-2 border-t border-slate-100 space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Past Requests</p>
            {answered.slice(0, 4).map((r) => (
              <div key={r.id} className="text-[11px] flex items-start justify-between gap-2">
                <span className={r.approved ? 'text-emerald-700' : 'text-red-600'}>
                  {r.approved ? `Granted: ${r.grantedRate}` : 'Declined'}
                  {r.approved && r.grantedByRole && (
                    <span className="text-slate-400"> · {rateSourceLabel(r.grantedByRole)}</span>
                  )}
                </span>
                <span className="text-slate-400 shrink-0">
                  {r.grantedAt ? new Date(r.grantedAt).toLocaleString() : ''}
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