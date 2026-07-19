// admin/src/Pages/modules/sales/components/CustomerEditRequestModal.jsx
import { useState, useEffect } from "react";
import { X, Send, Check, PencilLine, FileUp, Loader2 } from "lucide-react";
import {
  requestFieldChange,
  directFieldEdit,
  requestDocumentChange,
  decideFieldChangeRequest,
  getEditableFields,
} from "../services/customerService";
import { useToast } from "../../../../Components/hooks/useToast";
import { humanizeStatus } from "../../../../Components/utils/format";

const DOCUMENT_CATEGORIES = [
  { key: "SIGNED_OFFER_LETTER", label: "Signed Offer Letter" },
  { key: "OFFER_RATE_RECEIPT", label: "Signed Offer & Rate Receipt" },
  { key: "SIGNED_AGREEMENT", label: "Signed Agreement" },
  { key: "CUSTOMER_TIN", label: "Customer TIN" },
  { key: "CUSTOMER_BIN", label: "Customer BIN" },
  { key: "TRADE_LICENSE", label: "Trade License" },
  { key: "OTHERS", label: "Others Document" },
];

const buildContactFieldDefs = (contacts) =>
  (contacts || []).flatMap((c) =>
    ["name", "designation", "mobile", "email"].map((col) => ({
      key: `contact:${c.id}:${col}`,
      label: `${humanizeStatus(c.type)} — ${col.charAt(0).toUpperCase() + col.slice(1)}`,
      type: "text",
      current: c[col] || "",
    })),
  );

const CustomerEditRequestModal = ({
  customer,
  isLineManager,
  onClose,
  onDone,
}) => {
  const { showToast } = useToast();
  const [fieldDefs, setFieldDefs] = useState([]);
  const [selectedFields, setSelectedFields] = useState({});
  const [values, setValues] = useState({});
  const [selectedDocs, setSelectedDocs] = useState({});
  const [docFiles, setDocFiles] = useState({});
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tab, setTab] = useState("fields");

  useEffect(() => {
    getEditableFields()
      .then((defs) =>
        setFieldDefs([...defs, ...buildContactFieldDefs(customer.contacts)]),
      )
      .catch(() => setFieldDefs(buildContactFieldDefs(customer.contacts)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentValueFor = (f) =>
    f.current !== undefined ? f.current : customer[f.key];

  const toggleField = (key) => {
    setSelectedFields((prev) => ({ ...prev, [key]: !prev[key] }));
    if (values[key] === undefined) {
      const f = fieldDefs.find((d) => d.key === key);
      setValues((prev) => ({ ...prev, [key]: currentValueFor(f) ?? "" }));
    }
  };

  const toggleDoc = (key) =>
    setSelectedDocs((prev) => ({ ...prev, [key]: !prev[key] }));

  const existingDocsByType = (customer.documents || []).reduce((acc, d) => {
    acc[d.documentType] = d;
    return acc;
  }, {});

  const handleSubmit = async () => {
    if (isSubmitting) return;
    const fieldTargets = fieldDefs.filter(
      (f) => selectedFields[f.key] && values[f.key]?.toString().trim(),
    );
    const docTargets = DOCUMENT_CATEGORIES.filter(
      (d) => selectedDocs[d.key] && docFiles[d.key],
    );
    const docTargetsMissingFile = DOCUMENT_CATEGORIES.filter(
      (d) => selectedDocs[d.key] && !docFiles[d.key],
    );

    if (docTargetsMissingFile.length > 0) {
      return showToast(
        `Attach a file for: ${docTargetsMissingFile.map((d) => d.label).join(", ")}`,
        "warning",
      );
    }
    if (fieldTargets.length === 0 && docTargets.length === 0) {
      return showToast(
        "Select at least one field or document to change",
        "warning",
      );
    }

    setIsSubmitting(true);
    try {
      for (const f of fieldTargets) {
        if (isLineManager) {
          await directFieldEdit(
            customer.id,
            f.key,
            values[f.key].toString().trim(),
          );
        } else {
          await requestFieldChange(
            customer.id,
            f.key,
            values[f.key].toString().trim(),
            reason.trim(),
          );
        }
      }
      for (const d of docTargets) {
        const req = await requestDocumentChange(
          customer.id,
          d.key,
          reason.trim(),
          docFiles[d.key],
        );
        if (isLineManager) await decideFieldChangeRequest(req.id, true);
      }
      showToast(
        isLineManager ? "Changes saved" : "Edit request sent to Line Manager",
        "success",
      );
      onDone?.();
      onClose();
    } catch (err) {
      showToast(err?.message || "Failed to submit", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFieldInput = (f) => {
    if (f.type === "select") {
      return (
        <select
          className="w-full mt-2 border border-slate-300 p-2 rounded text-xs bg-white outline-none focus:border-emerald-500"
          value={values[f.key] ?? ""}
          onChange={(e) =>
            setValues((prev) => ({ ...prev, [f.key]: e.target.value }))
          }
        >
          <option value="">Select...</option>
          {(f.options || []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    }
    if (f.type === "textarea") {
      return (
        <textarea
          className="w-full mt-2 border border-slate-300 p-2 rounded text-xs outline-none focus:border-emerald-500 min-h-[60px]"
          placeholder={`New ${f.label}`}
          value={values[f.key] ?? ""}
          onChange={(e) =>
            setValues((prev) => ({ ...prev, [f.key]: e.target.value }))
          }
        />
      );
    }
    return (
      <input
        type={f.type === "number" ? "number" : "text"}
        className="w-full mt-2 border border-slate-300 p-2 rounded text-xs outline-none focus:border-emerald-500"
        placeholder={`New ${f.label}`}
        value={values[f.key] ?? ""}
        onChange={(e) =>
          setValues((prev) => ({ ...prev, [f.key]: e.target.value }))
        }
      />
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 flex items-center">
            <PencilLine size={17} className="mr-2 text-emerald-600" />{" "}
            {isLineManager ? "Edit Customer Details" : "Request Edit"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 transition"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-2 px-5 pt-3 border-b border-slate-100">
          <button
            type="button"
            onClick={() => setTab("fields")}
            className={`px-3 py-1.5 text-xs font-bold border-b-2 transition ${tab === "fields" ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-400"}`}
          >
            Account Fields & Contacts
          </button>
          <button
            type="button"
            onClick={() => setTab("documents")}
            className={`px-3 py-1.5 text-xs font-bold border-b-2 transition ${tab === "documents" ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-400"}`}
          >
            Documents
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-3">
          <p className="text-xs text-slate-500">
            {isLineManager
              ? "Select what you want to update. Field changes apply immediately; document uploads replace the file right away."
              : "Select what you want changed. Your Line Manager reviews each item individually before it applies."}
          </p>

          {tab === "fields" &&
            fieldDefs.map((f) => (
              <div
                key={f.key}
                className={`border rounded-lg p-3 transition ${selectedFields[f.key] ? "border-emerald-300 bg-emerald-50/40" : "border-slate-200"}`}
              >
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!selectedFields[f.key]}
                    onChange={() => toggleField(f.key)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  {f.label}
                  <span className="text-[10px] font-normal text-slate-400 ml-auto truncate max-w-[40%]">
                    Current: {currentValueFor(f) || "—"}
                  </span>
                </label>
                {selectedFields[f.key] && renderFieldInput(f)}
              </div>
            ))}

          {tab === "documents" &&
            DOCUMENT_CATEGORIES.map((d) => (
              <div
                key={d.key}
                className={`border rounded-lg p-3 transition ${selectedDocs[d.key] ? "border-emerald-300 bg-emerald-50/40" : "border-slate-200"}`}
              >
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!selectedDocs[d.key]}
                    onChange={() => toggleDoc(d.key)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <FileUp size={13} className="text-slate-400" /> {d.label}
                  <span className="text-[10px] font-normal text-slate-400 ml-auto truncate max-w-[35%]">
                    {existingDocsByType[d.key]?.originalName || "Not uploaded"}
                  </span>
                </label>
                {selectedDocs[d.key] && (
                  <div className="mt-2">
                    <label className="block border-2 border-dashed border-emerald-200 rounded-lg py-3 text-center cursor-pointer hover:bg-emerald-50/50 transition text-xs font-semibold text-emerald-700">
                      {docFiles[d.key]
                        ? docFiles[d.key].name
                        : "Click to select replacement file"}
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) =>
                          setDocFiles((prev) => ({
                            ...prev,
                            [d.key]: e.target.files?.[0] || null,
                          }))
                        }
                      />
                    </label>
                    <p className="text-[10px] text-slate-400 mt-1.5">
                      {isLineManager
                        ? "Uploads and replaces the file immediately."
                        : "Uploads now; your Line Manager's approval swaps it into the customer's file the moment they approve."}
                    </p>
                  </div>
                )}
              </div>
            ))}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Reason {!isLineManager && "(recommended)"}
            </label>
            <input
              className="w-full border border-slate-300 p-2 rounded text-xs outline-none focus:border-emerald-500"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this change needed?"
            />
          </div>
        </div>

        <div className="p-5 border-t border-slate-100">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="w-full bg-emerald-700 text-white font-bold py-3 rounded-lg text-sm shadow-md hover:bg-emerald-800 transition disabled:opacity-50 flex items-center justify-center"
          >
            {isSubmitting ? (
              <Loader2 size={16} className="mr-2 animate-spin" />
            ) : isLineManager ? (
              <Check size={16} className="mr-2" />
            ) : (
              <Send size={16} className="mr-2" />
            )}
            {isLineManager ? "Save Changes" : "Send Edit Request"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerEditRequestModal;
