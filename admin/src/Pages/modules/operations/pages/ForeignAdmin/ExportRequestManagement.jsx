// src/Pages/modules/operations/pages/ForeignAdmin/ExportRequestManagement.jsx
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp } from 'lucide-react';
import SectionCard from '../../components/SectionCard';
import Loader from '../../../../../Components/Shared/Loader';
import { useToast } from '../../../../../Components/hooks/useToast';
import { useOperationsAuth } from '../../hooks/useOperationsAuth';
import { fetchRequestsByMode, updateRequestStatus, approveRequestAndCreateShipment, sendHeadMessageToClient, REQUEST_STATUS } from '../../services/requestService';
import { OPERATIONS_ROLES } from '../../constants/operationsRoles';
import { isRequired } from '../../../../../Components/utils/validators';

const STATUS_TONE = {
  [REQUEST_STATUS.PENDING]: 'bg-amber-50 text-amber-700',
  [REQUEST_STATUS.APPROVED]: 'bg-emerald-50 text-emerald-700',
  [REQUEST_STATUS.REJECTED]: 'bg-red-50 text-red-600',
};

const ExportRequestManagement = () => {
  const { currentUser } = useOperationsAuth();
  const canApprove = currentUser?.role === OPERATIONS_ROLES.OPERATIONS_HEAD;
  const { showToast } = useToast();
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [messageDrafts, setMessageDrafts] = useState({});
  const [sendingMessageId, setSendingMessageId] = useState(null);

  const handleSendMessage = async (id) => {
    const text = messageDrafts[id] || '';
    if (!isRequired(text)) return showToast('Enter a message to send', 'warning');
    setSendingMessageId(id);
    try {
      await sendHeadMessageToClient(id, text);
      showToast('Message sent to client');
      setMessageDrafts((prev) => ({ ...prev, [id]: '' }));
      await load();
    } catch (err) {
      showToast(err?.message || 'Failed to send message', 'error');
    } finally {
      setSendingMessageId(null);
    }
  };

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setRows(await fetchRequestsByMode('EXPORT'));
    } catch {
      showToast('Failed to load export requests', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = useCallback(
    async (id) => {
      setBusyId(id);
      try {
        const { shipment } = await approveRequestAndCreateShipment(id, currentUser?.name);
        showToast(`Approved — AWB ${shipment.awbNumber} generated`);
        await load();
      } catch (err) {
        showToast(err?.message || 'Failed to approve request', 'error');
      } finally {
        setBusyId(null);
      }
    },
    [currentUser, showToast, load]
  );

  const handleReject = useCallback(
    async (id) => {
      setBusyId(id);
      try {
        await updateRequestStatus(id, REQUEST_STATUS.REJECTED, 'Rejected by Foreign Admin');
        showToast('Request rejected');
        await load();
      } catch (err) {
        showToast(err?.message || 'Failed to update request', 'error');
      } finally {
        setBusyId(null);
      }
    },
    [showToast, load]
  );

  if (isLoading) return <Loader label="Loading export requests..." />;

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4 md:p-0">
      <div>
        <h1 className="text-xl font-black text-slate-800">Export Request Management</h1>
        <p className="text-sm text-slate-500">Review client export requests. Approving auto-generates an AWB and shipment record.</p>
      </div>

      <SectionCard title="Export Requests">
        {rows.length === 0 ? (
          <p className="text-sm text-slate-400">No export requests submitted yet.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.id} className="border border-slate-100 rounded-lg overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 p-3">
                  <button type="button" onClick={() => setExpandedId(expandedId === r.id ? null : r.id)} className="flex items-center gap-2 text-left flex-1 min-w-0">
                    {expandedId === r.id ? <ChevronUp size={16} className="text-slate-400 shrink-0" /> : <ChevronDown size={16} className="text-slate-400 shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-700 truncate">{r.party?.companyName || '—'}</p>
                      <p className="text-xs text-slate-400 truncate">{r.clientEmail} · {r.parcel?.shipmentContents}</p>
                    </div>
                  </button>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${STATUS_TONE[r.status]}`}>{r.status.replace(/_/g, ' ')}</span>
                  {r.generatedAwbNumber && (
                    <Link to={`/operations/documents/awb/${encodeURIComponent(r.generatedAwbNumber)}`} className="text-xs font-bold text-emerald-600 hover:underline shrink-0">
                      View AWB {r.generatedAwbNumber}
                    </Link>
                  )}
                  {r.status === REQUEST_STATUS.PENDING && canApprove && (
                    <div className="flex gap-2 shrink-0">
                      <button type="button" disabled={busyId === r.id} onClick={() => handleApprove(r.id)} className="text-xs font-bold bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition disabled:opacity-50">
                        Approve
                      </button>
                      <button type="button" disabled={busyId === r.id} onClick={() => handleReject(r.id)} className="text-xs font-bold bg-red-50 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100 transition disabled:opacity-50">
                        Reject
                      </button>
                    </div>
                  )}
                  {r.status === REQUEST_STATUS.PENDING && !canApprove && (
                    <span className="text-[10px] font-bold text-slate-400 shrink-0">Pending Operations Head Approval</span>
                  )}
                </div>
                {expandedId === r.id && (
                  <div className="bg-slate-50 border-t border-slate-100 p-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <p className="font-bold text-slate-500 uppercase text-[10px] mb-1">Consignee</p>
                        <p>{r.party?.companyName}</p>
                        <p>{r.party?.contactPerson} · {r.party?.contactPhone}</p>
                        <p>{r.party?.address}, {r.party?.city}, {r.party?.country}</p>
                      </div>
                      <div>
                        <p className="font-bold text-slate-500 uppercase text-[10px] mb-1">Parcel</p>
                        <p>{r.parcel?.shipmentContents}</p>
                        <p>{r.parcel?.pieces} pcs · {r.parcel?.weightKg} kg · {r.parcel?.cartons} carton(s)</p>
                        <p>Type: {r.shipmentType} · Packaging: {r.packaging} · Services: {(r.services || []).join(', ') || '—'}</p>
                        {r.parcel?.remarks && <p>Remarks: {r.parcel.remarks}</p>}
                      </div>
                    </div>
                    {r.headMessage && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-[10px] font-bold text-amber-700 uppercase mb-1">Message sent to client{r.headMessageRead ? ' (Read)' : ' (Unread)'}</p>
                        <p className="text-xs text-amber-800">{r.headMessage}</p>
                        {(r.clientReplies || []).map((c, idx) => (
                          <p key={idx} className="text-xs text-slate-600 bg-white border border-slate-100 rounded-lg p-2 mt-1">Client: {c.text}</p>
                        ))}
                      </div>
                    )}
                    {r.status === REQUEST_STATUS.PENDING && (
                      <div className="flex gap-2">
                        <input
                          value={messageDrafts[r.id] || ''}
                          onChange={(e) => setMessageDrafts((prev) => ({ ...prev, [r.id]: e.target.value }))}
                          placeholder="Ask client for a missing document or info..."
                          maxLength={500}
                          className="flex-1 border border-slate-300 rounded-lg p-2 text-xs bg-white focus:border-emerald-500 outline-none"
                        />
                        <button type="button" disabled={sendingMessageId === r.id} onClick={() => handleSendMessage(r.id)} className="text-xs font-bold bg-slate-800 text-white px-3 py-2 rounded-lg hover:bg-slate-900 transition disabled:opacity-50">
                          {sendingMessageId === r.id ? 'Sending...' : 'Send to Client'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
};

export default ExportRequestManagement;