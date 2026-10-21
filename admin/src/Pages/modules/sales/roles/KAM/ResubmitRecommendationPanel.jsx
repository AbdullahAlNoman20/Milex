// admin/src/Pages/modules/sales/roles/KAM/ResubmitRecommendationPanel.jsx
import { useState, useRef } from 'react';
import { Send, Loader2, AlertTriangle } from 'lucide-react';
import { reviseRate, uploadRecommendationAttachment } from '../../services/customerService';
import { useToast } from '../../../../../Components/hooks/useToast';
import { useConfirm } from '../../../../../Components/hooks/useConfirm';
import { useAuth } from '../../../../../Components/hooks/useAuth';
import { isRequired } from '../../../../../Components/utils/validators';

const MAX_RATE_LENGTH = 300;
const MAX_NOTE_LENGTH = 1000;

const ResubmitRecommendationPanel = ({ customer, onUpdated }) => {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const { currentUser } = useAuth();
  const [proposedRate, setProposedRate] = useState(customer.proposedRate || '');
  const [note, setNote] = useState('');
  const [file, setFile] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const lockRef = useRef(false);

  // The server only lets the KAM who created the recommendation replace its
  // rate document.
  const canReplaceDocument = !!currentUser?.id && customer.recommendedById === currentUser.id;

  const clearFile = () => {
    setFile(null);
    setFileInputKey((k) => k + 1);
  };

  const handleResubmit = async () => {
    if (lockRef.current) return;
    if (!isRequired(proposedRate)) return showToast('Enter the proposed rate', 'warning');
    const ok = await confirm({
      title: 'Resubmit this recommendation?',
      message: `${customer.accountName} goes back to the Line Manager for a rate decision.`,
      confirmLabel: 'Resubmit',
    });
    if (!ok) return;

    lockRef.current = true;
    setIsSubmitting(true);
    try {
      if (file && canReplaceDocument) {
        await uploadRecommendationAttachment(customer.id, file);
      }
      await reviseRate(
        customer.id,
        proposedRate.trim().slice(0, MAX_RATE_LENGTH),
        note.trim() ? note.trim().slice(0, MAX_NOTE_LENGTH) : undefined
      );
      showToast('Recommendation resubmitted to the Line Manager', 'success');
      setNote('');
      clearFile();
      onUpdated?.();
    } catch (err) {
      showToast(err?.message || 'Could not resubmit the recommendation', 'error');
    } finally {
      lockRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-red-300 p-4 sm:p-6 space-y-4">
      <h3 className="font-bold text-slate-900 text-base">Recommendation Rejected</h3>

      {customer.lmNote && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-red-700 mb-1 flex items-center gap-1">
            <AlertTriangle size={12} /> Reason
          </p>
          <p className="text-xs text-slate-700 break-words whitespace-pre-line">{customer.lmNote}</p>
        </div>
      )}

      <p className="text-[11px] text-slate-500 leading-relaxed">
        Correct the recommendation, then resubmit it. Other recommendation details can be corrected with the edit
        option on this page before resubmitting.
      </p>

      <div>
        <label
          htmlFor={`resubmit-rate-${customer.id}`}
          className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5"
        >
          Proposed Rate <span className="text-red-500">*</span>
        </label>
        <textarea
          id={`resubmit-rate-${customer.id}`}
          className="w-full text-xs border border-slate-300 p-3 rounded-lg outline-none focus:border-emerald-500 min-h-[70px]"
          placeholder="e.g. 32 USD/Kg + 10 USD Custom"
          value={proposedRate}
          maxLength={MAX_RATE_LENGTH}
          onChange={(e) => setProposedRate(e.target.value)}
        />
      </div>

      {canReplaceDocument && (
        <div>
          <p className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
            Replace Rate Document (optional)
          </p>
          {file ? (
            <div className="flex items-center justify-between gap-2 text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5">
              <span className="truncate min-w-0">{file.name}</span>
              <button
                type="button"
                onClick={clearFile}
                className="text-slate-400 hover:text-red-500 shrink-0"
              >
                Remove
              </button>
            </div>
          ) : (
            <label className="block border-2 border-dashed border-slate-200 rounded-lg py-2.5 px-2 text-center cursor-pointer hover:bg-slate-50 transition text-xs font-semibold text-slate-500">
              Click to attach a document
              <input
                key={fileInputKey}
                type="file"
                accept=".xlsx,.xls,.csv,.doc,.docx,.pdf,image/*"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
          )}
        </div>
      )}

      <div>
        <label
          htmlFor={`resubmit-note-${customer.id}`}
          className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5"
        >
          Note for the Line Manager (optional)
        </label>
        <textarea
          id={`resubmit-note-${customer.id}`}
          className="w-full text-xs border border-slate-300 p-3 rounded-lg outline-none focus:border-emerald-500 min-h-[60px]"
          placeholder="What did you correct?"
          value={note}
          maxLength={MAX_NOTE_LENGTH}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <button
        type="button"
        disabled={isSubmitting}
        onClick={handleResubmit}
        className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl flex justify-center items-center text-sm shadow hover:bg-emerald-700 transition disabled:opacity-50"
      >
        {isSubmitting ? (
          <Loader2 size={16} className="mr-1.5 animate-spin" />
        ) : (
          <Send size={16} className="mr-1.5" />
        )}
        Resubmit to Line Manager
      </button>
    </div>
  );
};

export default ResubmitRecommendationPanel;