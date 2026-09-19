// admin/src/Pages/modules/sales/components/DocumentsList.jsx
import { useState } from "react";
import { FileText, Loader2, Eye, Mail } from "lucide-react";
import { getDocumentSignedUrl } from "../services/customerService";
import { useToast } from "../../../../Components/hooks/useToast";
import { useSales } from "../hooks/useSales";

const CATEGORY_LABELS = {
  SIGNED_OFFER_LETTER: "Signed Offer Letter (Customer Copy)",
  // Kept only so historical uploads of this now-retired category still show
  // a readable name instead of a raw key.
  OFFER_RATE_RECEIPT: "Signed Offer & Rate Receipt (Hard Copy Scan)",
  OFFER_LETTER_EXCEL: "Offer Letter Attachment (Rate File)",
  SIGNED_AGREEMENT: "Signed Agreement",
  CUSTOMER_TIN: "Customer TIN",
  CUSTOMER_BIN: "Customer BIN",
  TRADE_LICENSE: "Trade License",
  RECOMMENDATION_ATTACHMENT: "Recommendation Attachment (Rate Document)",
  OTHERS: "Others Document",
};

// customer.offerText / customer.agreementText live as plain text columns on
// Customer, not as rows in OnboardingDocument — so without this they'd never
// show up in the documents list even though they were already "sent". These
// are rendered as virtual, non-uploaded entries that open the print/preview
// view instead of a signed-file download.
const buildVirtualEntries = (customer) => {
  const entries = [];
  if (customer?.accountName) {
    entries.push({
      id: "virtual-recommendation",
      isVirtual: true,
      printType: "recommendation",
      documentType: "RECOMMENDATION_FORM",
      label: "Customer Recommendation Form",
      originalName: "Recommendation Form",
    });
  }
  if (customer?.offerText) {
    entries.push({
      id: "virtual-offer",
      isVirtual: true,
      printType: "offer",
      documentType: "OFFER_LETTER",
      label: "Offer Letter (Sent to Customer)",
      originalName: "Offer Letter",
    });
  }
  if (customer?.agreementText) {
    entries.push({
      id: "virtual-agreement",
      isVirtual: true,
      printType: "agreement",
      documentType: "AGREEMENT",
      label: "Agreement (Sent to Customer)",
      originalName: "Agreement",
    });
  }
  return entries;
};

const DocumentsList = ({ customer, documents = [] }) => {
  const { showToast } = useToast();
  const { setPrintData } = useSales();
  const [openingId, setOpeningId] = useState(null);

  const virtualEntries = buildVirtualEntries(customer);
  const allEntries = [...virtualEntries, ...documents];

  if (!allEntries.length) return null;

  const handleOpen = async (doc) => {
    if (doc.isVirtual) {
      setPrintData({ type: doc.printType, customer });
      return;
    }
    if (doc.scanStatus === "INFECTED") {
      return showToast(
        "This file was blocked by our security check and can't be opened. Please ask for a clean copy to be uploaded.",
        "error",
      );
    }
    if (doc.scanStatus === "ERROR") {
      return showToast(
        "We couldn't finish the security check on this file. Please try again in a few minutes.",
        "warning",
      );
    }
    if (doc.scanStatus !== "CLEAN") {
      return showToast(
        "This file is still being checked — try again shortly",
        "warning",
      );
    }
    setOpeningId(doc.id);
    try {
      const url = await getDocumentSignedUrl(doc.storageKey);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      showToast(err?.message || "Could not open file", "error");
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <div>
      <div className="px-1 pb-2.5">
        <h3 className="font-bold text-sm text-slate-900">Uploaded Documents</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {allEntries.map((doc) => (
          <div
            key={doc.id}
            className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center justify-between gap-3 text-xs"
          >
            <div className="min-w-0 flex items-start gap-2">
              {doc.isVirtual ? (
                <Mail size={14} className="text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <FileText
                  size={14}
                  className="text-slate-400 shrink-0 mt-0.5"
                />
              )}
              <div className="min-w-0">
                <p className="font-bold text-purple-700 break-words">
                  {doc.isVirtual
                    ? doc.label
                    : CATEGORY_LABELS[doc.documentType] || doc.documentType}
                </p>
                <p className="text-slate-600 break-words mt-0.5">
                  {doc.originalName}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleOpen(doc)}
              disabled={openingId === doc.id}
              className="shrink-0 inline-flex items-center gap-1.5 text-emerald-700 font-bold bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded hover:bg-emerald-100 transition disabled:opacity-50"
            >
              {openingId === doc.id ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Eye size={12} />
              )}
              View
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DocumentsList;
