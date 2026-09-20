// admin/src/Pages/modules/sales/components/DocumentsList.jsx
import { useState, useEffect } from "react";
import { FileText, Loader2, Eye, Mail } from "lucide-react";
import { getDocumentSignedUrl, listCorrespondence } from "../services/customerService";
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

const SENT_VIA_LABEL = {
  MAIL: "Sent by email",
  HARD_COPY: "Sent as hard copy",
};

// The recommendation form has no stored copy — it is generated from the
// record itself, so it is always available and always current.
const buildRecommendationEntry = (customer) =>
  customer?.accountName
    ? [
        {
          id: "virtual-recommendation",
          isVirtual: true,
          printType: "recommendation",
          documentType: "RECOMMENDATION_FORM",
          label: "Customer Recommendation Form",
          originalName: "Generated from this record",
        },
      ]
    : [];

// Every offer letter and agreement that was actually sent, each as its own
// numbered copy. These belong with the documents because that is what they
// are to the person looking — paperwork this customer has been given — even
// though they are generated rather than uploaded.
const buildSentEntries = (copies, customer) =>
  copies.map((copy) => {
    const isOffer = copy.kind === "OFFER_LETTER";
    return {
      id: copy.id,
      isVirtual: true,
      printType: isOffer ? "offer" : "agreement",
      documentType: copy.kind,
      label: `${isOffer ? "Offer Letter" : "Agreement"} — Copy ${copy.copyNumber}`,
      originalName: [
        new Date(copy.createdAt).toLocaleDateString(),
        copy.sentVia ? SENT_VIA_LABEL[copy.sentVia] : null,
        copy.rateAtSend ? `Rate: ${copy.rateAtSend}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      // Printing an older copy must show that copy's wording, not whatever
      // the record happens to hold now.
      printCustomer: isOffer
        ? { ...customer, offerText: copy.body }
        : { ...customer, agreementText: copy.body },
    };
  });

const DocumentsList = ({ customer, documents = [], reloadToken = 0 }) => {
  const { showToast } = useToast();
  const { setPrintData } = useSales();
  const [openingId, setOpeningId] = useState(null);
  const [copies, setCopies] = useState([]);

  useEffect(() => {
    let cancelled = false;
    listCorrespondence(customer.id)
      .then((data) => {
        if (!cancelled) setCopies(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setCopies([]);
      });
    return () => {
      cancelled = true;
    };
  }, [customer.id, reloadToken]);

  const allEntries = [
    ...buildRecommendationEntry(customer),
    ...buildSentEntries(copies, customer),
    ...documents,
  ];

  if (!allEntries.length) return null;

  const handleOpen = async (doc) => {
    if (doc.isVirtual) {
      setPrintData({ type: doc.printType, customer: doc.printCustomer || customer });
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
                {doc.expiryDate && (() => {
                  const days = Math.ceil(
                    (new Date(doc.expiryDate).getTime() - Date.now()) / 86400000
                  );
                  return (
                    <p
                      className={`text-[10px] font-bold mt-1 ${
                        days < 0 ? 'text-red-600' : days <= 30 ? 'text-amber-600' : 'text-slate-400'
                      }`}
                    >
                      {days < 0
                        ? `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`
                        : days === 0
                          ? 'Expires today'
                          : `${days} day${days === 1 ? '' : 's'} until expiry`}
                    </p>
                  );
                })()}
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
