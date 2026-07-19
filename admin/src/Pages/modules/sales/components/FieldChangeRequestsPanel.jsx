// admin/src/Pages/modules/sales/components/FieldChangeRequestsPanel.jsx
import React, { useEffect, useState, useCallback } from "react";
import { CheckCircle, XCircle, GitPullRequestDraft } from "lucide-react";
import {
  listFieldChangeRequests,
  decideFieldChangeRequest,
} from "../services/customerService";
import { useToast } from "../../../../Components/hooks/useToast";

const FieldChangeRequestsPanel = ({ customer, onDecided }) => {
  const { showToast } = useToast();
  const [items, setItems] = useState([]);

  const load = useCallback(() => {
    listFieldChangeRequests(customer.id)
      .then(setItems)
      .catch(() => setItems([]));
  }, [customer.id]);

  useEffect(() => {
    load();
  }, [load]);

  const pending = items.filter((r) => r.approved === null);
  if (pending.length === 0) return null;

  const decide = async (id, approve) => {
    try {
      await decideFieldChangeRequest(id, approve);
      showToast(approve ? "Change applied" : "Request rejected", "success");
      load();
      onDecided?.();
    } catch (err) {
      showToast(err?.message || "Failed", "error");
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-amber-300 p-5 space-y-3">
      <h3 className="font-bold text-slate-900 text-sm flex items-center">
        <GitPullRequestDraft size={16} className="mr-2 text-amber-600" />{" "}
        Pending Edit Requests
      </h3>
      {pending.map((r) => (
        <div
          key={r.id}
          className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs space-y-2"
        >
          <p>
            <strong>{r.fieldLabel}:</strong>{" "}
            {r.documentType
              ? "Requesting re-upload access"
              : `${r.oldValue || "—"} → ${r.newValue}`}
          </p>
          {r.reason && <p className="text-slate-500">Reason: {r.reason}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => decide(r.id, true)}
              className="flex-1 bg-emerald-600 text-white font-bold py-1.5 rounded flex items-center justify-center gap-1"
            >
              <CheckCircle size={12} /> Approve
            </button>
            <button
              type="button"
              onClick={() => decide(r.id, false)}
              className="flex-1 bg-white border border-red-300 text-red-500 font-bold py-1.5 rounded flex items-center justify-center gap-1"
            >
              <XCircle size={12} /> Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default FieldChangeRequestsPanel;
