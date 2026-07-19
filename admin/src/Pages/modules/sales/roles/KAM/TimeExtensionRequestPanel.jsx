// admin/src/Pages/modules/sales/roles/KAM/TimeExtensionRequestPanel.jsx
import React, { useState } from "react";
import { Clock3 } from "lucide-react";
import { useToast } from "../../../../../Components/hooks/useToast";
import { requestTimeExtension } from "../../services/customerService";
import { isRequired } from "../../../../../Components/utils/validators";

const MAX_REQUESTABLE_DAYS = 90;

const TimeExtensionRequestPanel = ({ customer, onUpdated }) => {
  const { showToast } = useToast();
  const [requestedDays, setRequestedDays] = useState("5");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRequestExtension = async () => {
    if (isSubmitting) return;
    const days = Number(requestedDays);
    if (!Number.isFinite(days) || days < 1 || days > MAX_REQUESTABLE_DAYS) {
      return showToast(
        `Requested days must be between 1 and ${MAX_REQUESTABLE_DAYS}`,
        "warning",
      );
    }
    if (!isRequired(reason)) return showToast("Reason is required", "warning");

    setIsSubmitting(true);
    try {
      const updated = await requestTimeExtension(customer.id, days, reason);
      showToast(
        "Time extension requested — awaiting Line Manager decision",
        "success",
      );
      onUpdated?.(updated);
      setReason("");
    } catch (err) {
      showToast(err?.message || "Request failed", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-purple-300 p-6 space-y-3">
      <h3 className="font-bold text-slate-900 text-base flex items-center">
        <Clock3 size={18} className="mr-2 text-purple-600" /> Request Time
        Extension
      </h3>
      <p className="text-xs text-slate-500">
        Default 5 days — Line Manager may grant more if needed.
      </p>
      <input
        type="number"
        min="1"
        max={MAX_REQUESTABLE_DAYS}
        value={requestedDays}
        onChange={(e) => setRequestedDays(e.target.value)}
        className="w-full border border-slate-300 p-2.5 rounded-lg text-sm outline-none focus:border-purple-500"
      />
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
        Request Extension
      </button>
    </div>
  );
};

export default TimeExtensionRequestPanel;
