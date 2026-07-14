// admin/src/Pages/modules/sales/pages/CustomerDetail.jsx 
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building, Printer, Timer } from 'lucide-react';
import { useSales } from '../hooks/useSales';
import { useAuth } from '../../../../Components/hooks/useAuth';
import { ROLES } from '../../../../Components/constants/roles';
import { STATUS, getWorkflowStageLabel } from '../constants/salesStatus';
import StatusBadge from '../components/StatusBadge';
import BarcodeBadge from '../../../../Components/Shared/BarcodeBadge';
import CustomerContactsCard from '../components/CustomerContactsCard';
import AuditTrail from '../components/AuditTrail';
import Loader from '../../../../Components/Shared/Loader';
import Countdown from '../../../../Components/Shared/Countdown';

import RateApprovalPanel from '../roles/LineManager/RateApprovalPanel';
import CustomerInfoApprovalPanel from '../roles/LineManager/CustomerInfoApprovalPanel';
import OfferLetterPanel from '../roles/SalesCoordinator/OfferLetterPanel';
import AgreementPanel from '../roles/SalesCoordinator/AgreementPanel';
import InfoUpdateRequestPanel from '../roles/KAM/InfoUpdateRequestPanel';
import DocumentUploadPanel from '../roles/KAM/DocumentUploadPanel';
import DocumentsList from '../components/DocumentsList';
import TimeExtensionRequestPanel from '../roles/KAM/TimeExtensionRequestPanel';
import FinalOnboardingReviewPanel from '../roles/LineManager/FinalOnboardingReviewPanel';

const PROVISIONAL_COUNTDOWN_STATUSES = [
  STATUS.PROVISIONAL_ACTIVE,
  STATUS.PROVISIONAL_EXTENSION_REQUESTED,
  STATUS.PROVISIONAL_FINAL_REVIEW_PENDING,
];

const Waiting = ({ children }) => (
  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{children}</p>
  </div>
);

const CustomerDetail = () => {
  const { barcode } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { customers, isLoading, loadError, setSelectedCustomer, setPrintData, findByBarcode } = useSales();

  const listCustomer = useMemo(
    () => customers.find((c) => c.barcode === barcode) || null,
    [customers, barcode]
  );

  const [detail, setDetail] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const customer = detail && detail.barcode === barcode ? detail : listCustomer;

  const refreshCustomer = useCallback(() => setRefreshTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    if (!barcode) return undefined;
    findByBarcode(barcode).then((full) => {
      if (!cancelled && full) setDetail(full);
    });
    return () => {
      cancelled = true;
    };
  }, [barcode, listCustomer, refreshTick, findByBarcode]);

  useEffect(() => {
    if (customer) setSelectedCustomer(customer);
  }, [customer, setSelectedCustomer]);

  if (isLoading) return <Loader fullScreen label="Loading customer record..." />;
  if (loadError) return <p className="text-sm text-red-600 font-semibold">{loadError}</p>;
  if (!customer) {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <p className="text-slate-500 font-semibold mb-4">Customer record not found.</p>
        <button type="button" onClick={() => navigate('/app/customers')} className="text-emerald-600 font-bold text-sm hover:underline">
          Back to Customers
        </button>
      </div>
    );
  }

  const role = currentUser?.role;
  const isDocHandler = role === ROLES.KAM || role === ROLES.SALES_COORDINATOR;
  const isProvisionalActive = customer.accountProfileType === 'PROVISIONAL' && customer.status === STATUS.PROVISIONAL_ACTIVE;
  const canUploadDocs = isProvisionalActive && customer.offerAccepted && customer.agreementSent;

  const renderActionPanel = () => {
    if (customer.status === STATUS.ACTIVE) return null;

    if (customer.status === STATUS.INFO_UPDATE_PENDING && role === ROLES.LINE_MANAGER) {
      return <CustomerInfoApprovalPanel customer={customer} />;
    }
    if ([STATUS.PENDING_RATE, STATUS.PENDING_APPROVAL].includes(customer.status) && role === ROLES.LINE_MANAGER) {
      return <RateApprovalPanel customer={customer} />;
    }

    if (isProvisionalActive) {
      if (role === ROLES.SALES_COORDINATOR) {
        if (!customer.offerSent) return <OfferLetterPanel customer={customer} />;
        if (!customer.offerAccepted) return <Waiting>Awaiting customer feedback via KAM</Waiting>;
        if (!customer.agreementSent) return <AgreementPanel customer={customer} onSent={refreshCustomer} />;
        return <TimeExtensionRequestPanel customer={customer} onUpdated={refreshCustomer} />;
      }
      if (role === ROLES.KAM) {
        if (!customer.offerSent) return <Waiting>Waiting for the Sales Coordinator to send the offer letter</Waiting>;
        if (!customer.offerAccepted) return <InfoUpdateRequestPanel customer={customer} mode="offer-feedback" />;
        if (!customer.agreementSent) return <Waiting>Waiting for the Sales Coordinator to collect the Agreement</Waiting>;
        return <TimeExtensionRequestPanel customer={customer} onUpdated={refreshCustomer} />;
      }
    }

    if (
      customer.accountProfileType === 'PROVISIONAL' &&
      role === ROLES.LINE_MANAGER &&
      [STATUS.PROVISIONAL_EXTENSION_REQUESTED, STATUS.PROVISIONAL_FINAL_REVIEW_PENDING].includes(customer.status)
    ) {
      return <FinalOnboardingReviewPanel customer={customer} onUpdated={refreshCustomer} />;
    }

    return <Waiting>Waiting for other department</Waiting>;
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 animate-in fade-in duration-300 pb-12">
      <button type="button" onClick={() => navigate(-1)} className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center mb-2 transition">
        <ArrowLeft size={14} className="mr-1.5" /> Back
      </button>

      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 mb-2">{customer.accountName}</h2>
          <div className="flex items-center gap-3 flex-wrap">
            <BarcodeBadge value={customer.barcode} />
            {customer.rateRef && <BarcodeBadge value={`REF-${customer.rateRef}`} variant="blue" />}
          </div>
        </div>
        <StatusBadge status={customer.status} />
      </div>

      {customer.accountProfileType === 'PROVISIONAL' && PROVISIONAL_COUNTDOWN_STATUSES.includes(customer.status) && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center">
            <Timer size={18} className="text-purple-500 mr-3 shrink-0" />
            <div>
              <p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest mb-1">Document Upload Window</p>
              <p className="text-xs text-purple-700">Time remaining in the 21-day provisional period</p>
            </div>
          </div>
          <Countdown expiryDate={customer.provisionalExpiryDate} className="text-purple-900 text-lg" />
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="flex-1 min-w-0 space-y-6">
          <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
              <h3 className="font-bold text-base text-slate-800 flex items-center">
                <Building size={18} className="mr-2 text-slate-400" /> Account Info
              </h3>
              <button
                type="button"
                onClick={() => setPrintData({ type: 'recommendation', customer })}
                className="text-emerald-600 text-xs font-bold flex items-center bg-emerald-50 px-3 py-1.5 rounded-md border border-emerald-100 hover:bg-emerald-100 transition"
              >
                <Printer size={14} className="mr-1.5" /> Print Form
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-8 text-sm mb-8">
              <div>
                <span className="block text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-1.5">ADDRESS</span>
                <span className="font-medium text-slate-700 leading-relaxed block">{customer.address}</span>
              </div>
              <div>
                <span className="block text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-1.5">BUSINESS TYPE</span>
                <span className="font-medium text-slate-700">{customer.businessType}</span>
              </div>
              <div>
                <span className="block text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-1.5">MOBILE / EMAIL</span>
                <span className="font-medium text-slate-700 block mb-0.5">{customer.mobile}</span>
                <span className="text-slate-500 text-xs">{customer.email}</span>
              </div>
              <div>
                <span className="block text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-1.5">CREDIT LIMIT / PERIOD</span>
                <span className="font-medium text-slate-700">TK {customer.creditLimitTk} ({customer.creditPeriodDays} Days)</span>
              </div>
            </div>
            <span className="block text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-2">PRIMARY CONTACTS</span>
            <CustomerContactsCard contacts={customer.contacts} />
            {customer.recNote && (
              <div className="p-5 bg-[#FFFBF0] rounded-xl border border-[#FDE68A] mt-6">
                <span className="block text-amber-700 text-[10px] uppercase font-bold tracking-widest mb-2">KAM RECOMMENDATION NOTE</span>
                <p className="italic text-amber-900 font-bold text-sm leading-relaxed">{customer.recNote}</p>
              </div>
            )}
          </div>
        </div>

        <div className="w-full lg:w-[380px] shrink-0 space-y-6">
          {renderActionPanel()}
          <AuditTrail history={customer.history} activeStepLabel={getWorkflowStageLabel(customer)} />
        </div>
      </div>

      {canUploadDocs && isDocHandler && <DocumentUploadPanel customer={customer} onUploaded={refreshCustomer} />}
      {!canUploadDocs && <DocumentsList documents={customer.documents} />}
    </div>
  );
};

export default CustomerDetail;