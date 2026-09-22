// src/Pages/modules/operations/pages/Client/MyRequests.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import SectionCard from '../../components/SectionCard';
import Loader from '../../../../../Components/Shared/Loader';
import { useOperationsAuth } from '../../hooks/useOperationsAuth';
import { useToast } from '../../../../../Components/hooks/useToast';
import { fetchRequestsByClientEmail, markHeadMessageRead, addClientReply, REQUEST_STATUS } from '../../services/requestService';
import { isRequired } from '../../../../../Components/utils/validators';

const STATUS_TONE = {
  [REQUEST_STATUS.PENDING]: 'bg-amber-50 text-amber-700',
  [REQUEST_STATUS.APPROVED]: 'bg-emerald-50 text-emerald-700',
  [REQUEST_STATUS.REJECTED]: 'bg-red-50 text-red-600',
};

const MyRequests = () => {
  const { currentUser } = useOperationsAuth();
  const { showToast } = useToast();
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modeFilter, setModeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [expandedId, setExpandedId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setRequests(await fetchRequestsByClientEmail(currentUser?.email));
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let rows = requests;
    if (modeFilter !== 'ALL') rows = rows.filter((r) => r.mode === modeFilter);
    if (statusFilter !== 'ALL') rows = rows.filter((r) => r.status === statusFilter);
    return rows;
  }, [requests, modeFilter, statusFilter]);

  const handleExpand = async (r) => {
    const opening = expandedId !== r.id;
    setExpandedId(opening ? r.id : null);
    setReplyText('');
    if (opening && r.headMessage && !r.headMessageRead) {
      await markHeadMessageRead(r.id);
      await load();
    }
  };

  const handleReply = async (id) => {
    if (!isRequired(replyText)) return showToast('Enter a reply before sending', 'warning');
    setIsReplying(true);
    try {
      await addClientReply(id, replyText);
      showToast('Reply sent to Operations Head');
      setReplyText('');
      await load();
    } catch (err) {
      showToast(err?.message || 'Failed to send reply', 'error');
    } finally {
      setIsReplying(false);
    }
  };

  if (isLoading) return <Loader label="Loading your requests..." />;

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4 md:p-0">
      <div>
        <h1 className="text-xl font-black text-slate-800">My Requests</h1>
        <p className="text-sm text-slate-500">All import and export requests you've submitted, and their current status.</p>
      </div>

      <SectionCard
        title="Requests"
        actions={
          <div className="flex gap-2">
            <select value={modeFilter} onChange={(e) => setModeFilter(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs bg-slate-50 focus:border-emerald-500 outline-none">
              <option value="ALL">All Modes</option>
              <option value="IMPORT">Import</option>
              <option value="EXPORT">Export</option>
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs bg-slate-50 focus:border-emerald-500 outline-none">
              <option value="ALL">All Status</option>
              <option value={REQUEST_STATUS.PENDING}>Pending Review</option>
              <option value={REQUEST_STATUS.APPROVED}>Approved</option>
              <option value={REQUEST_STATUS.REJECTED}>Rejected</option>
            </select>
          </div>
        }
      >
        {filtered.length === 0 ? (
          <p className="text-sm text-slate-400">No requests match your filters.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((r) => {
              const hasUnread = r.headMessage && !r.headMessageRead;
              return (
                <div key={r.id} className={`border rounded-lg overflow-hidden ${hasUnread ? 'border-amber-300' : 'border-slate-100'}`}>
                  <button type="button" onClick={() => handleExpand(r)} className="w-full flex flex-wrap items-center justify-between gap-2 p-3 text-left hover:bg-slate-50 transition">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-700">{r.mode} — {r.party?.companyName || '—'}</p>
                      <p className="text-xs text-slate-400">{new Date(r.createdAt).toLocaleDateString()} · {r.parcel?.shipmentContents}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {hasUnread && <span className="text-[10px] font-bold text-amber-700">Message from Operations Head</span>}
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${STATUS_TONE[r.status]}`}>{r.status.replace(/_/g, ' ')}</span>
                    </div>
                  </button>
                  {expandedId === r.id && (
                    <div className="bg-slate-50 border-t border-slate-100 p-4 space-y-4">
                      {r.headMessage && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                          <p className="text-[10px] font-bold text-amber-700 uppercase mb-1">Request from Operations Head</p>
                          <p className="text-sm text-amber-800">{r.headMessage}</p>
                        </div>
                      )}
                      {(r.clientReplies || []).length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-slate-500 uppercase">Your Replies</p>
                          {r.clientReplies.map((c, idx) => (
                            <p key={idx} className="text-xs text-slate-600 bg-white border border-slate-100 rounded-lg p-2">{c.text}</p>
                          ))}
                        </div>
                      )}
                      {r.headMessage && (
                        <div className="flex gap-2">
                          <input
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Reply or attach info here..."
                            maxLength={500}
                            className="flex-1 border border-slate-300 rounded-lg p-2 text-sm bg-white focus:border-emerald-500 outline-none"
                          />
                          <button type="button" disabled={isReplying} onClick={() => handleReply(r.id)} className="text-xs font-bold bg-emerald-600 text-white px-3 py-2 rounded-lg hover:bg-emerald-700 transition disabled:opacity-50">
                            Send
                          </button>
                        </div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div>
                          <p className="font-bold text-slate-500 uppercase text-[10px] mb-1">{r.mode === 'EXPORT' ? 'Receiver' : 'Shipper'}</p>
                          <p>{r.party?.companyName}</p>
                          <p>{r.party?.contactPerson} · {r.party?.contactPhone}</p>
                          <p>{r.party?.address}, {r.party?.city}, {r.party?.country}</p>
                        </div>
                        <div>
                          <p className="font-bold text-slate-500 uppercase text-[10px] mb-1">Parcel</p>
                          <p>{r.parcel?.shipmentContents}</p>
                          <p>{r.parcel?.pieces} pcs · {r.parcel?.weightKg} kg · {r.parcel?.cartons} carton(s)</p>
                          <p>Type: {r.shipmentType} · Packaging: {r.packaging} · Services: {(r.services || []).join(', ') || '—'}</p>
                        </div>
                      </div>
                      {r.generatedAwbNumber && (
                        <p className="text-xs font-bold text-emerald-700">AWB Generated: {r.generatedAwbNumber}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
};

export default MyRequests;