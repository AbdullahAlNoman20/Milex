// admin/src/Pages/modules/sales/components/DocumentsList.jsx 
import { useState } from "react";
import { FileText, Loader2, Eye, Mail } from "lucide-react";
import { getDocumentSignedUrl } from "../services/customerService";
import { useToast } from "../../../../Components/hooks/useToast";
import { useSales } from "../hooks/useSales";

const CATEGORY_LABELS = {
  SIGNED_OFFER_LETTER: "Signed Offer Letter (Customer Copy)",
  OFFER_RATE_RECEIPT: "Signed Offer & Rate Receipt (Hard Copy Scan)",
  OFFER_LETTER_EXCEL: "Offer Letter — Rate/Volume Excel",
  SIGNED_AGREEMENT: "Signed Agreement",
  CUSTOMER_TIN: "Customer TIN",
  CUSTOMER_BIN: "Customer BIN",
  TRADE_LICENSE: "Trade License",
  OTHERS: "Others Document",
};

// customer.offerText / customer.agreementText live as plain text columns on
// Customer, not as rows in OnboardingDocument — so without this they'd never
// show up in the documents list even though they were already "sent". These
// are rendered as virtual, non-uploaded entries that open the print/preview
// view instead of a signed-file download.
const buildVirtualEntries = (customer) => {
  const entries = [];
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
    if (doc.scanStatus !== "CLEAN") {
      return showToast(
        "This file is still being scanned — try again shortly",
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
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-3">
      <h3 className="font-bold text-slate-900 text-base">Uploaded Documents</h3>
      <div className="space-y-2">
        {allEntries.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center justify-between text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 gap-3"
          >
            <div className="min-w-0 flex items-center gap-2">
              {doc.isVirtual ? (
                <Mail size={14} className="text-emerald-500 shrink-0" />
              ) : (
                <FileText size={14} className="text-slate-400 shrink-0" />
              )}
              <div className="min-w-0">
                <p className="font-bold text-purple-700">
                  {doc.isVirtual ? doc.label : (CATEGORY_LABELS[doc.documentType] || doc.documentType)}
                </p>
                <p className="text-slate-500 truncate">{doc.originalName}</p>
                {!doc.isVirtual && (doc.documentNumber || doc.expiryDate) && (
                  <p className="text-slate-400 mt-0.5">
                    {doc.documentNumber ? `No: ${doc.documentNumber}` : ""}
                    {doc.documentNumber && doc.expiryDate ? " · " : ""}
                    {doc.expiryDate
                      ? `Expires: ${new Date(doc.expiryDate).toLocaleDateString()}`
                      : ""}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleOpen(doc)}
              disabled={openingId === doc.id}
              className="shrink-0 flex items-center gap-1.5 text-emerald-700 font-bold bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded hover:bg-emerald-100 transition disabled:opacity-50"
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