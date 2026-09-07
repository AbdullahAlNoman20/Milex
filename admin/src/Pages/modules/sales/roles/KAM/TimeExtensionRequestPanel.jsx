// admin/src/Pages/modules/sales/roles/KAM/TimeExtensionRequestPanel.jsx — FULL REPLACE
import { useState, useRef } from "react";
import { Clock3 } from "lucide-react";
import { useToast } from "../../../../../Components/hooks/useToast";
import { requestTimeExtension } from "../../services/customerService";
import { isRequired } from "../../../../../Components/utils/validators";

const EXTENSION_DAYS = 5;

const TimeExtensionRequestPanel = ({ customer, onUpdated }) => {
  const { showToast } = useToast();
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLockRef = useRef(false);

  const handleRequestExtension = async () => {
    if (submitLockRef.current) return;
    if (!isRequired(reason)) return showToast("Reason is required", "warning");

    submitLockRef.current = true;
    setIsSubmitting(true);
    try {
      const updated = await requestTimeExtension(customer.id, EXTENSION_DAYS, reason);
      showToast("Extension requested — awaiting Line Manager decision", "success");
      onUpdated?.(updated);
      setReason("");
    } catch (err) {
      showToast(err?.message || "Request failed", "error");
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-purple-300 p-6 space-y-3">
      <h3 className="font-bold text-slate-900 text-base flex items-center">
        <Clock3 size={18} className="mr-2 text-purple-600" /> Provisional Period Expired
      </h3>
      <p className="text-xs text-slate-500">
        The 21-day document upload window has ended. You can request a {EXTENSION_DAYS}-day extension from your Line Manager.
      </p>
      <textarea
        className="w-full text-xs border border-slate-300 p-3 rounded-lg outline-none focus:border-purple-500 min-h-[70px]"
        placeholder="Reason for extension request"
        value={reason}
        maxLength={500}
        onChange={(e) => setReason(e.target.value)}
      />
      <button
        type="button"
        disabled={isSubmitting}
        onClick={handleRequestExtension}
        className="w-full bg-purple-600 text-white font-bold py-2.5 rounded-lg text-sm shadow hover:bg-purple-700 transition disabled:opacity-50"
      >
        Request {EXTENSION_DAYS}-Day Extension
      </button>
    </div>
  );
};

export default TimeExtensionRequestPanel;