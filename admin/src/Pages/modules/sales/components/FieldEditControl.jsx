// admin/src/Pages/modules/sales/components/FieldEditControl.jsx
import React, { useState } from "react";
import { Pencil, X, Check } from "lucide-react";
import {
  requestFieldChange,
  directFieldEdit,
} from "../services/customerService";
import { useToast } from "../../../../Components/hooks/useToast";

// KAM/SC: opens a "Request Edit" box → goes to LM for approval.
// Line Manager: edits directly, no approval needed (per item 7's last line).
const FieldEditControl = ({
  customer,
  fieldKey,
  label,
  currentValue,
  isLineManager,
  onChanged,
}) => {
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState(currentValue || "");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (isSubmitting || !value.trim()) return;
    setIsSubmitting(true);
    try {
      if (isLineManager) {
        await directFieldEdit(customer.id, fieldKey, value.trim());
        showToast(`${label} updated`, "success");
      } else {
        await requestFieldChange(
          customer.id,
          fieldKey,
          value.trim(),
          reason.trim(),
        );
        showToast("Edit request sent to Line Manager", "success");
      }
      setIsOpen(false);
      onChanged?.();
    } catch (err) {
      showToast(err?.message || "Failed to submit", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="text-slate-300 hover:text-emerald-600 transition ml-2 inline-flex"
        aria-label={`Edit ${label}`}
      >
        <Pencil size={12} />
      </button>
    );
  }

  return (
    <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
      <input
        className="w-full border border-slate-300 p-2 rounded text-xs outline-none focus:border-emerald-500"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={`New ${label}`}
      />
      {!isLineManager && (
        <input
          className="w-full border border-slate-300 p-2 rounded text-xs outline-none focus:border-emerald-500"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (optional)"
        />
      )}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleSubmit}
          className="flex-1 bg-emerald-600 text-white text-xs font-bold py-1.5 rounded flex items-center justify-center gap-1 disabled:opacity-50"
        >
          <Check size={12} /> {isLineManager ? "Save" : "Send Request"}
        </button>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="px-3 bg-white border border-slate-200 rounded text-slate-500"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
};

export default FieldEditControl;
