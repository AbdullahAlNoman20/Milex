// admin/src/Pages/modules/sales/pages/CustomerDetail.jsx
import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Building,
  Printer,
  Timer,
  PencilLine,
  Eye,
  X,
  History as HistoryIcon,
} from "lucide-react";
import { useSales } from "../hooks/useSales";
import { useAuth } from "../../../../Components/hooks/useAuth";
import { ROLES } from "../../../../Components/constants/roles";
import { STATUS, getWorkflowStageLabel } from "../constants/salesStatus";
import { buildRateRefs, rateSourceLabel } from "../../../../Components/utils/format";
import StatusBadge from "../components/StatusBadge";
import BarcodeBadge from "../../../../Components/Shared/BarcodeBadge";
import ScannableBarcode from "../../../../Components/Shared/ScannableBarcode";
import CustomerContactsCard from "../components/CustomerContactsCard";
import AuditTrail from "../components/AuditTrail";
import Loader from "../../../../Components/Shared/Loader";
import Countdown from "../../../../Components/Shared/Countdown";

import RateApprovalPanel from "../roles/LineManager/RateApprovalPanel";
import HodRatePanel from "../roles/HOD/HodRatePanel";
import KamRateDecisionPanel from "../roles/KAM/KamRateDecisionPanel";
import ReviseRateApprovalPanel from "../roles/LineManager/ReviseRateApprovalPanel";
import CustomerInfoApprovalPanel from "../roles/LineManager/CustomerInfoApprovalPanel";
import OfferLetterPanel from "../roles/SalesCoordinator/OfferLetterPanel";
import AgreementPanel from "../roles/SalesCoordinator/AgreementPanel";
import InfoUpdateRequestPanel from "../roles/KAM/InfoUpdateRequestPanel";
import DocumentsList from "../components/DocumentsList";
import FinalAccountProfilePanel from "../roles/KAM/FinalAccountProfilePanel";
import FinalAccountProfileView from "../components/FinalAccountProfileView";
import FieldChangeRequestsPanel from "../components/FieldChangeRequestsPanel";
import TimeExtensionRequestPanel from "../roles/KAM/TimeExtensionRequestPanel";
import FinalOnboardingReviewPanel from "../roles/LineManager/FinalOnboardingReviewPanel";
import CustomerEditRequestModal from "../components/CustomerEditRequestModal";
import AdminCustomerActions from "../components/AdminCustomerActions";
import RateRequestPanel from "../components/RateRequestPanel";
import CustomerEditHistoryModal from "../components/CustomerEditHistoryModal";
import CorrespondenceList from "../components/CorrespondenceList";

const PROVISIONAL_COUNTDOWN_STATUSES = [
  STATUS.PROVISIONAL_ACTIVE,
  STATUS.PROVISIONAL_EXTENSION_REQUESTED,
  STATUS.PROVISIONAL_FINAL_REVIEW_PENDING,
  STATUS.PROVISIONAL_EXPIRED,
];

const Waiting = ({ children }) => (
  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
      {children}
    </p>
  </div>
);

const CustomerDetail = () => {
  const { barcode } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { setSelectedCustomer, setPrintData, findByBarcode, reloadToken } =
    useSales();

  // One piece of state describes the whole fetch: which barcode it belongs
  // to, whether it finished, what came back. Deriving "loading" from that
  // (rather than flipping a separate flag on the way in) means the effect
  // only ever writes once, when the response lands.
  const [result, setResult] = useState({
    barcode: null,
    customer: null,
    error: null,
  });
  const [refreshTick, setRefreshTick] = useState(0);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isRateHistoryOpen, setIsRateHistoryOpen] = useState(false);

  // A response for a previous barcode is stale the moment the route changes,
  // so it counts as "still loading" rather than briefly showing the wrong
  // customer's record.
  const isLoading = result.barcode !== barcode;
  const loadError = isLoading ? null : result.error;
  // The full record comes from its own endpoint — no partially-populated
  // stand-in taken from a preloaded list, so what is rendered is always the
  // complete customer rather than the trimmed columns a list view needs.
  const customer = isLoading ? null : result.customer;

  // `reloadToken` already re-runs the fetch below whenever a mutation goes
  // through the context, so panels that call this after their own direct
  // service call are the only ones that need the extra tick.
  const refreshCustomer = useCallback(() => setRefreshTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    if (!barcode) return undefined;
    findByBarcode(barcode)
      .then((full) => {
        if (!cancelled)
          setResult({ barcode, customer: full || null, error: null });
      })
      .catch((err) => {
        if (!cancelled) {
          setResult({
            barcode,
            customer: null,
            error: err?.message || "Could not load this customer record.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [barcode, refreshTick, reloadToken, findByBarcode]);

  useEffect(() => {
    if (customer) setSelectedCustomer(customer);
  }, [customer, setSelectedCustomer]);

  if (isLoading)
    return <Loader fullScreen label="Loading customer record..." />;
  if (loadError)
    return <p className="text-sm text-red-600 font-semibold">{loadError}</p>;
  if (!customer) {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <p className="text-slate-500 font-semibold mb-4">
          Customer record not found.
        </p>
        <button
          type="button"
          onClick={() => navigate("/app/customers")}
          className="text-emerald-600 font-bold text-sm hover:underline"
        >
          Back to Customers
        </button>
      </div>
    );
  }

  const role = currentUser?.role;
  const isLmOrAdmin =
    role === ROLES.LINE_MANAGER ||
    role === ROLES.HEAD_OF_DEPARTMENT ||
    role === ROLES.SUPER_ADMIN;
  const isSuperAdmin = role === ROLES.SUPER_ADMIN;
  const canAssignKam =
    role === ROLES.LINE_MANAGER ||
    role === ROLES.HEAD_OF_DEPARTMENT ||
    role === ROLES.SUPER_ADMIN;
  // KAM/SC keep direct-edit access to the recommendation-form fields all the
  // way through the provisional period — only once the account is fully
  // ACTIVE does it become request-only (account-profile fields are always
  // request-only for them, enforced server-side).
  const isActiveAccount = customer.status === STATUS.ACTIVE;
  // Sales Coordinators never get direct edit — their changes always route
  // through an LM-approved edit request, matching the server-side rule.
  const canDirectEdit = isLmOrAdmin || (role === ROLES.KAM && !isActiveAccount);
  const restrictToRecommendationFields = !isLmOrAdmin && canDirectEdit;
  const canEditProfile =
    role === ROLES.SALES_COORDINATOR || role === ROLES.KAM || isLmOrAdmin;
  const isProvisionalActive =
    customer.accountProfileType === "PROVISIONAL" &&
    customer.status === STATUS.PROVISIONAL_ACTIVE;
  const isProvisionalExpired =
    customer.accountProfileType === "PROVISIONAL" &&
    customer.status === STATUS.PROVISIONAL_EXPIRED;
  const canUploadDocs =
    isProvisionalActive && customer.offerAccepted && customer.agreementSent;
  // Only the Sales Coordinator files documents now; the KAM still sees the
  // profile, read-only, so they know where the onboarding has got to.
  const isEditingProfile = canUploadDocs && role === ROLES.SALES_COORDINATOR;

  const renderActionPanel = () => {
    // A live account has no pending step of its own; the rate panel below
    // is the one thing still available on it.
    if (customer.status === STATUS.ACTIVE) return null;

    // The Head of Department carries every approval the Line Manager does,
    // across all teams rather than one — so anywhere a Line Manager acts,
    // they can act too.
    const isApprover =
      role === ROLES.LINE_MANAGER || role === ROLES.HEAD_OF_DEPARTMENT;

    if (customer.status === STATUS.INFO_UPDATE_PENDING && isApprover) {
      return <CustomerInfoApprovalPanel customer={customer} />;
    }

    // The Line Manager's desk: set the rate here, or hand the decision up to
    // the Head of Department.
    if (
      [STATUS.PENDING_RATE, STATUS.PENDING_APPROVAL].includes(customer.status)
    ) {
      if (isApprover)
        return (
          <RateApprovalPanel customer={customer} onUpdated={refreshCustomer} />
        );
      return <Waiting>Waiting for the Line Manager to decide on the rate</Waiting>;
    }

    // Escalated. Nobody but the Head of Department can move it on.
    if (customer.status === STATUS.PENDING_HOD_RATE) {
      if (role === ROLES.HEAD_OF_DEPARTMENT || isSuperAdmin) {
        return <HodRatePanel customer={customer} onUpdated={refreshCustomer} />;
      }
      return (
        <Waiting>Waiting for the Head of Department to set the best rate</Waiting>
      );
    }

    // A rate exists but nothing has reached the customer yet — the KAM
    // decides whether it goes out or goes back.
    if (customer.status === STATUS.PENDING_KAM_REVIEW) {
      if (role === ROLES.KAM || isSuperAdmin) {
        return (
          <KamRateDecisionPanel customer={customer} onUpdated={refreshCustomer} />
        );
      }
      return <Waiting>Waiting for the KAM to review the rate</Waiting>;
    }

    // The Sales Coordinator's desk.
    if (customer.status === STATUS.APPROVED_PENDING_OFFER) {
      if (role === ROLES.SALES_COORDINATOR || isSuperAdmin) {
        return <OfferLetterPanel customer={customer} />;
      }
      return (
        <Waiting>Waiting for the Sales Coordinator to send the offer letter</Waiting>
      );
    }

    // The customer's answer, collected by the KAM. Once it has been given,
    // the form disappears — there is nothing left to answer, and leaving it
    // on screen invites the same answer being sent twice.
    if (customer.status === STATUS.OFFER_REVIEW) {
      if (customer.offerAccepted) {
        return <Waiting>Offer accepted — waiting for the Sales Coordinator to send the agreement</Waiting>;
      }
      if (customer.offerRejected) {
        return <Waiting>Offer rejected — back with the Line Manager for a new rate</Waiting>;
      }
      if (role === ROLES.KAM || isSuperAdmin) {
        return (
          <InfoUpdateRequestPanel customer={customer} mode="offer-feedback" />
        );
      }
      return <Waiting>Awaiting the customer's feedback via the KAM</Waiting>;
    }

    // Even after the 21-day window auto-expires, the same offer/agreement/
    // extension panels still apply — the account isn't dead, it's just
    // waiting on a Line-Manager-approved extension to reopen the window.

    if (customer.status === STATUS.OFFER_REJECTED) {
      if (isApprover) {
        return (
          <ReviseRateApprovalPanel
            customer={customer}
            onUpdated={refreshCustomer}
          />
        );
      }
      return (
        <Waiting>
          Customer rejected the offer — waiting for Line Manager to approve a
          new rate
        </Waiting>
      );
    }

    if (isProvisionalActive) {
      // The customer rejected the offer. The account stays provisional (the
      // 21-day document window is still running) but the rate goes back to
      // the Line Manager before anything else can happen.
      if (customer.offerRejected) {
        if (isApprover || isSuperAdmin) {
          return (
            <ReviseRateApprovalPanel
              customer={customer}
              onUpdated={refreshCustomer}
            />
          );
        }
        return (
          <Waiting>
            Customer rejected the offer — waiting for the Line Manager to
            approve a new rate
          </Waiting>
        );
      }
      if (role === ROLES.SALES_COORDINATOR) {
        if (!customer.offerSent)
          return <OfferLetterPanel customer={customer} />;
        if (!customer.offerAccepted)
          return <Waiting>Awaiting customer feedback via KAM</Waiting>;
        if (!customer.agreementSent)
          return (
            <AgreementPanel customer={customer} onSent={refreshCustomer} />
          );
        return <Waiting>Waiting for KAM to complete document upload</Waiting>;
      }
      if (role === ROLES.KAM) {
        if (!customer.offerSent)
          return (
            <Waiting>
              Waiting for the Sales Coordinator to send the offer letter
            </Waiting>
          );
        // Only while the answer is still outstanding. Once it is given the
        // form goes, whichever way the customer went.
        if (!customer.offerAccepted && !customer.offerRejected)
          return (
            <InfoUpdateRequestPanel customer={customer} mode="offer-feedback" />
          );
        if (!customer.agreementSent)
          return (
            <Waiting>
              Waiting for the Sales Coordinator to collect the Agreement
            </Waiting>
          );
        // Document upload happens in the main panel above while still
        // within the 21-day window.
        return null;
      }
    }

    if (isProvisionalExpired) {
      if (role === ROLES.KAM) {
        return (
          <TimeExtensionRequestPanel
            customer={customer}
            onUpdated={refreshCustomer}
          />
        );
      }
      return (
        <Waiting>
          Provisional period expired — waiting for KAM to request an extension
        </Waiting>
      );
    }

    // NOTE: accountProfileType alone can't gate this — regular-mode final
    // onboarding also transitions through PROVISIONAL_FINAL_REVIEW_PENDING
    // but sets accountProfileType to 'REGULAR' at that point (see
    // submitFinalOnboardingRegular), so checking for 'PROVISIONAL' here was
    // hiding the review panel for those accounts. Extension requests are
    // still provisional-only by nature (PROVISIONAL_EXTENSION_REQUESTED only
    // ever fires from a provisional flow), so this still works correctly.
    if (
      isApprover &&
      [
        STATUS.PROVISIONAL_EXTENSION_REQUESTED,
        STATUS.PROVISIONAL_FINAL_REVIEW_PENDING,
      ].includes(customer.status)
    ) {
      return (
        <FinalOnboardingReviewPanel
          customer={customer}
          onUpdated={refreshCustomer}
        />
      );
    }

    return <Waiting>Waiting for other department</Waiting>;
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-4 md:px-6 space-y-4 sm:space-y-5 pt-4 pb-12 overflow-x-hidden">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-3.5 py-2.5 rounded-lg hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98] transition min-h-[40px]"
      >
        <ArrowLeft size={15} className="shrink-0" /> Back
      </button>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-2xl font-bold text-slate-900 mb-2 break-words">
              {customer.accountName}
            </h2>
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <ScannableBarcode value={customer.barcode} />
              {buildRateRefs(customer).map((ref) => (
                <BarcodeBadge
                  key={ref}
                  value={ref}
                  variant="blue"
                  showBars={false}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setIsHistoryModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-50 px-3 py-2 rounded-md border border-slate-200 hover:bg-slate-100 transition min-h-[36px]"
            >
              <Eye size={14} /> History
            </button>
            {canEditProfile && (
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-50 px-3 py-2 rounded-md border border-slate-200 hover:bg-slate-100 transition min-h-[36px]"
              >
                <PencilLine size={14} /> Edit
              </button>
            )}
            <StatusBadge status={customer.status} />
          </div>
        </div>
      </div>

      {customer.offerRejected &&
        customer.status === STATUS.PROVISIONAL_ACTIVE && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 sm:p-5 flex gap-3">
            <Eye size={16} className="text-red-500 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-red-600 uppercase tracking-wide mb-1">
                Offer Rejected by Customer
              </p>
              <p className="text-xs text-red-700 leading-relaxed">
                The account remains provisional and the document upload window
                is still running. A new rate from the Line Manager is needed
                before a revised offer letter can be sent.
              </p>
              {customer.rejectReason && (
                <p className="text-xs text-red-800 font-semibold mt-2 break-words">
                  Customer's feedback: {customer.rejectReason}
                </p>
              )}
            </div>
          </div>
        )}

      {customer.accountProfileType === "PROVISIONAL" &&
        customer.provisionalExpiryDate &&
        PROVISIONAL_COUNTDOWN_STATUSES.includes(customer.status) && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <Timer size={16} className="text-purple-500 shrink-0" />
              <div>
                <p className="text-[11px] font-bold text-purple-600 uppercase tracking-wide mb-0.5">
                  Document Upload Window
                </p>
                <p className="text-xs text-purple-700">
                  Time remaining in the 21-day provisional period
                </p>
              </div>
            </div>
            <Countdown
              expiryDate={customer.provisionalExpiryDate}
              className="text-purple-900 text-base sm:text-lg"
            />
          </div>
        )}

      {customer.accountProfileType === "PROVISIONAL" &&
        !customer.provisionalExpiryDate &&
        customer.status === STATUS.PROVISIONAL_ACTIVE && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center gap-2.5">
            <Timer size={15} className="text-slate-400 shrink-0" />
            <p className="text-xs text-slate-600">
              The 21-day document window starts once the customer accepts the
              offer.
            </p>
          </div>
        )}

      <div className="flex flex-col lg:flex-row gap-5 items-start">
        <div className="flex-1 w-full min-w-0 space-y-5">
          {/* Account Info as table */}
          <div className="space-y-5">
            {/* Customer Overview */}
            <div>
              <div className="flex items-center justify-between gap-3 px-1 pb-2.5">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Building size={16} className="text-slate-400" /> Customer
                  Overview
                </h3>
                <div className="flex items-center gap-2 shrink-0">
                  {Array.isArray(customer.rateHistory) &&
                    customer.rateHistory.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setIsRateHistoryOpen(true)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200 hover:bg-slate-100 transition"
                      >
                        <HistoryIcon size={13} /> Rate History
                      </button>
                    )}
                  <button
                    type="button"
                    onClick={() => setPrintData({ type: "profile", customer })}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-md border border-emerald-100 hover:bg-emerald-100 transition"
                  >
                    <Printer size={13} /> Print form
                  </button>
                </div>
              </div>

              <table className="w-full text-sm border-collapse table-fixed bg-white rounded-xl border border-slate-200 overflow-hidden">
                <colgroup>
                  <col className="w-[30%] sm:w-[22%]" />
                  <col className="w-[70%] sm:w-[28%]" />
                  <col className="hidden sm:table-column sm:w-[22%]" />
                  <col className="hidden sm:table-column sm:w-[28%]" />
                </colgroup>
                <tbody>
                  {[
                    [
                      "Address",
                      customer.address,
                      "Business Type",
                      customer.businessType,
                    ],
                    [
                      "Mobile",
                      customer.phone || "—",
                      "Email",
                      customer.email || "—",
                    ],
                    [
                      "Credit Limit",
                      `TK ${customer.creditLimitTk}`,
                      "Credit Period",
                      `${customer.creditPeriodDays} Days`,
                    ],
                    [
                      "Approved Rate",
                      customer.approvedRate || "—",
                      "Proposed Rate",
                      customer.proposedRate || "—",
                    ],
                    [
                      "Service",
                      customer.serviceRequired,
                      "Mode",
                      customer.accountMode,
                    ],
                    ["Type", customer.accountType, "", ""],
                  ].map(([l1, v1, l2, v2], i) => (
                    <tr
                      key={i}
                      className={`border-b border-slate-100 last:border-b-0 ${i % 2 ? "bg-slate-50/60" : ""}`}
                    >
                      <td className="px-4 sm:px-5 py-3 align-top text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                        {l1}
                      </td>
                      <td className="px-4 sm:px-5 py-3 align-top font-medium text-slate-800 break-words">
                        {v1}
                      </td>
                      {l2 ? (
                        <>
                          <td className="hidden sm:table-cell px-5 py-3 align-top text-[11px] font-bold text-slate-400 uppercase tracking-wide border-l border-slate-100">
                            {l2}
                          </td>
                          <td className="hidden sm:table-cell px-5 py-3 align-top font-medium text-slate-800 break-words">
                            {v2}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="hidden sm:table-cell border-l border-slate-100" />
                          <td className="hidden sm:table-cell" />
                        </>
                      )}
                    </tr>
                  ))}
                  {/* stacked view of the right-hand pair on mobile only */}
                  <tr className="sm:hidden border-b border-slate-100 bg-slate-50/60">
                    <td className="px-4 py-3 align-top text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                      Business Type
                    </td>
                    <td className="px-4 py-3 align-top font-medium text-slate-800 break-words">
                      {customer.businessType}
                    </td>
                  </tr>
                  <tr className="sm:hidden border-b border-slate-100">
                    <td className="px-4 py-3 align-top text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                      Email
                    </td>
                    <td className="px-4 py-3 align-top font-medium text-slate-800 break-words">
                      {customer.email || "—"}
                    </td>
                  </tr>
                  <tr className="sm:hidden border-b border-slate-100 bg-slate-50/60">
                    <td className="px-4 py-3 align-top text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                      Credit Period
                    </td>
                    <td className="px-4 py-3 align-top font-medium text-slate-800 break-words">
                      {customer.creditPeriodDays} Days
                    </td>
                  </tr>
                  <tr className="sm:hidden border-b border-slate-100">
                    <td className="px-4 py-3 align-top text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                      Proposed Rate
                    </td>
                    <td className="px-4 py-3 align-top font-medium text-slate-800 break-words">
                      {customer.proposedRate || "—"}
                    </td>
                  </tr>
                  <tr className="sm:hidden">
                    <td className="px-4 py-3 align-top text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                      Mode
                    </td>
                    <td className="px-4 py-3 align-top font-medium text-slate-800 break-words">
                      {customer.accountMode}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>

          {/* Approved Rate (current) — full revision history is in the Rate History modal */}
          <div>
            <div className="px-1 pb-2.5">
              <h3 className="font-bold text-sm text-slate-900">
                Approved Rate
              </h3>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 px-4 sm:px-5 py-4">
              <p className="text-sm font-semibold text-slate-800 break-words">
                {customer.approvedRate || "—"}
              </p>
              {/* After two or three rounds the figure alone means little —
                  whose authority set it is the part people act on. */}
              {customer.approvedRate && (
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Given by: <strong>{rateSourceLabel(customer.rateSource)}</strong>
                </p>
              )}
              {customer.lmNote && (
                <p className="text-[11px] text-slate-600 mt-1.5 break-words">
                  Note: {customer.lmNote}
                </p>
              )}
            </div>
          </div>

          {/* Shipping & Route Details */}
          {(customer.shippingDetails || []).length > 0 && (
            <div>
              <div className="px-1 pb-2.5">
                <h3 className="font-bold text-sm text-slate-900">
                  Shipping & Route Details
                </h3>
              </div>

              {/* mobile: stacked cards, no horizontal scroll */}
              <div className="sm:hidden divide-y divide-slate-100 bg-white rounded-xl border border-slate-200 overflow-hidden">
                {customer.shippingDetails.map((s) => (
                  <div key={s.id} className="px-4 py-3 space-y-1.5 text-xs">
                    <div className="flex justify-between gap-3">
                      <span className="font-bold text-slate-400 uppercase text-[10px]">
                        Type
                      </span>
                      <span className="text-slate-700 text-right break-words">
                        {(s.shipmentType || []).join(", ")}
                        {s.shipmentTypeOther ? ` (${s.shipmentTypeOther})` : ""}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="font-bold text-slate-400 uppercase text-[10px]">
                        Rate For
                      </span>
                      <span className="text-slate-700">{s.rateFor}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="font-bold text-slate-400 uppercase text-[10px]">
                        Country
                      </span>
                      <span className="text-slate-700">{s.country}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="font-bold text-slate-400 uppercase text-[10px]">
                        Volume/Weight
                      </span>
                      <span className="text-slate-700">
                        {s.volume} / {s.weight}kg
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="font-bold text-slate-400 uppercase text-[10px]">
                        Revenue
                      </span>
                      <span className="text-slate-700">${s.revenue}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="font-bold text-slate-400 uppercase text-[10px]">
                        Provider
                      </span>
                      <span className="text-slate-700 text-right break-words">
                        {s.provider}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* desktop/tablet: real table */}
              <table className="hidden sm:table w-full text-xs border-collapse bg-white rounded-xl border border-slate-200 overflow-hidden">
                <thead>
                  <tr className="bg-slate-200 text-slate-700">
                    <th className="px-4 py-2.5 text-left font-bold">
                      Shipment Type
                    </th>
                    <th className="px-4 py-2.5 text-left font-bold">
                      Rate For
                    </th>
                    <th className="px-4 py-2.5 text-left font-bold">
                      Country
                    </th>
                    <th className="px-4 py-2.5 text-left font-bold">
                      Volume
                    </th>
                    <th className="px-4 py-2.5 text-left font-bold">
                      Weight
                    </th>
                    <th className="px-4 py-2.5 text-left font-bold">
                      Revenue
                    </th>
                    <th className="px-4 py-2.5 text-left font-bold">
                      Current Provider
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {customer.shippingDetails.map((s) => (
                    <tr key={s.id} className="border-t border-slate-100">
                      <td className="px-4 py-2.5 text-slate-700 break-words">
                        {(s.shipmentType || []).join(", ")}
                        {s.shipmentTypeOther ? ` (${s.shipmentTypeOther})` : ""}
                      </td>
                      <td className="px-4 py-2.5 text-slate-700">
                        {s.rateFor}
                      </td>
                      <td className="px-4 py-2.5 text-slate-700">
                        {s.country}
                      </td>
                      <td className="px-4 py-2.5 text-slate-700">
                        {s.volume}CBM
                      </td>
                      <td className="px-4 py-2.5 text-slate-700">
                        {s.weight}KG
                      </td>
                      <td className="px-4 py-2.5 text-slate-700">
                        ${s.revenue}
                      </td>
                      <td className="px-4 py-2.5 text-slate-700 break-words">
                        {s.provider}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Primary Contacts */}
          <div>
            <div className="px-1 pb-2.5">
              <h3 className="font-bold text-sm text-slate-900">
                Primary Contacts
              </h3>
            </div>
            <CustomerContactsCard contacts={customer.contacts} />
          </div>

          {customer.recNote && (
            <div className="p-4 sm:p-5 bg-amber-50 rounded-xl border border-amber-200">
              <span className="block text-amber-600 text-[11px] font-bold uppercase tracking-wide mb-1.5">
                KAM Recommendation Note
              </span>
              <p className="italic text-amber-700 font-medium text-sm leading-relaxed break-words">
                {customer.recNote}
              </p>
            </div>
          )}

          {isEditingProfile && (
            <FinalAccountProfilePanel
              customer={customer}
              onSaved={refreshCustomer}
            />
          )}
          {!isEditingProfile && <FinalAccountProfileView customer={customer} />}
        </div>

        <div className="w-full lg:w-[360px] shrink-0 space-y-5">
          {renderActionPanel()}
          {isLmOrAdmin && (
            <FieldChangeRequestsPanel
              customer={customer}
              onDecided={refreshCustomer}
            />
          )}
          {/* Only on a live account. Everywhere earlier in the flow the rate
              decision already has its own panel above, and showing a second
              way to ask for one alongside it just invites two open requests
              for the same thing. */}
          {isActiveAccount && (
            <RateRequestPanel
              customer={customer}
              onUpdated={refreshCustomer}
              reloadToken={refreshTick}
            />
          )}
          {canAssignKam && (
            <AdminCustomerActions
              customer={customer}
              onChanged={refreshCustomer}
            />
          )}
          <AuditTrail
            history={customer.history}
            activeStepLabel={getWorkflowStageLabel(customer)}
          />
        </div>
      </div>

      {!canUploadDocs && (
        <DocumentsList
          customer={customer}
          documents={customer.documents}
          reloadToken={refreshTick}
        />
      )}



      {isEditModalOpen && (
        <CustomerEditRequestModal
          customer={customer}
          isLineManager={canDirectEdit}
          restrictToRecommendationFields={restrictToRecommendationFields}
          onClose={() => setIsEditModalOpen(false)}
          onDone={refreshCustomer}
        />
      )}

      {isHistoryModalOpen && (
        <CustomerEditHistoryModal
          customerId={customer.id}
          onClose={() => setIsHistoryModalOpen(false)}
        />
      )}

      {isRateHistoryOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setIsRateHistoryOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 flex items-center justify-between border-b border-slate-100 shrink-0">
              <h3 className="font-bold text-base text-slate-800">
                Rate Revision History
              </h3>
              <button
                type="button"
                onClick={() => setIsRateHistoryOpen(false)}
                className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 transition"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 overflow-y-auto">
              <div className="mb-4 rounded-xl border-2 border-emerald-300 bg-emerald-50/50 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 mb-1">
                  Current Rate
                </p>
                <p className="text-sm font-bold text-slate-800 break-words">
                  {customer.approvedRate || customer.proposedRate || "—"}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Given by: <strong>{rateSourceLabel(customer.rateSource)}</strong>
                </p>
              </div>

              {/* Newest replacement first, so the sequence reads the way it
                  happened — the rate that was just superseded sits at the top. */}
              <table className="w-full text-xs border-collapse bg-white rounded-xl border border-slate-200 overflow-hidden">
                <thead>
                  <tr className="bg-slate-200 text-slate-700">
                    <th className="px-4 py-2.5 text-left font-bold">Rate</th>
                    <th className="px-4 py-2.5 text-left font-bold">Given By</th>
                    <th className="px-4 py-2.5 text-left font-bold">Replaced</th>
                  </tr>
                </thead>
                <tbody>
                  {[...customer.rateHistory]
                    .sort((a, b) => {
                      const at = a.changedAt ? new Date(a.changedAt).getTime() : 0;
                      const bt = b.changedAt ? new Date(b.changedAt).getTime() : 0;
                      return bt - at;
                    })
                    .map((h, i) => (
                      <tr key={i} className="border-t border-slate-100 align-top">
                        <td className="px-4 py-2.5 text-slate-700 break-words">
                          <span className="font-semibold line-through decoration-slate-300">
                            {h.rate || "—"}
                          </span>
                          {h.rateRef && (
                            <span className="block font-mono text-[10px] text-slate-400 mt-0.5">
                              REF-{h.rateRef}
                            </span>
                          )}
                          {h.reason && (
                            <span className="block text-[10px] text-red-600 mt-1 break-words">
                              {h.reason}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">
                          {rateSourceLabel(h.source)}
                        </td>
                        <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">
                          {h.changedAt
                            ? new Date(h.changedAt).toLocaleDateString()
                            : "—"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDetail;
