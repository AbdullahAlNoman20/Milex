import { useState, useCallback, useMemo } from 'react';
import { useToast } from '../../../../Components/hooks/useToast';
import * as customerService from '../services/customerService';
import { SalesContext } from './SalesContextObject';

// Maps the historyAction text each panel already sends into the specific
// backend endpoint that must run. This is the single place that translates
// "what the UI is asking for" into "which real API call to make" — every
// panel keeps calling updateStatus(...) exactly as before, unchanged.
const ACTION_TO_SERVICE_CALL = {
  'RATE APPROVED BY LM': (id, updates) => customerService.approveRate(id, updates),
  'RATE REJECTED BY LM': (id) => customerService.rejectRate(id),
  'DRAFTING OFFER LETTER': (id) => customerService.draftOffer(id),
  'OFFER LETTER SENT': (id, updates) => customerService.finalizeOffer(id, updates.offerText, updates.sentVia),
  'OFFER ACCEPTED BY CUSTOMER': (id) => customerService.submitClientFeedback(id, true),
  'OFFER REJECTED BY CUSTOMER': (id, updates) =>
    customerService.submitClientFeedback(id, false, updates.rejectReason),
  'RATE SUBMITTED BY KAM': (id, updates) => customerService.reviseRate(id, updates.proposedRate),
  'REVISED RATE SUBMITTED TO LM': (id, updates) => customerService.reviseRate(id, updates.proposedRate),
  'DRAFTING AGREEMENT': (id) => customerService.draftAgreement(id),
  'AGREEMENT FINALIZED': (id, updates) => customerService.finalizeAgreement(id, updates.agreementText),
  'AGREEMENT SIGNED — PROVISIONAL ACCOUNT CREATED': (id) => customerService.activateProvisional(id),
  'AGREEMENT SIGNED — ACCOUNT ACTIVATED': (id) => customerService.activateDirect(id),
  'INFO UPDATE REQUESTED BY KAM': (id, updates) =>
    customerService.requestInfoUpdate(id, updates.pendingInfoUpdate?.field, updates.pendingInfoUpdate?.newValue),
  'INFO UPDATE APPROVED BY LM': (id) => customerService.decideInfoUpdate(id, true),
  'INFO UPDATE REJECTED BY LM': (id) => customerService.decideInfoUpdate(id, false),
  'NEW RATE APPROVED BY LM': (id, updates) =>
    customerService.reapproveRateAfterRejection(id, updates.approvedRate, updates.lmNote),
};

// This provider no longer holds the customer list. Every screen asks the
// server for the one page it is showing, so the amount of data in memory is
// the same whether the company has fifty customers or fifty thousand — and
// nothing is ever hidden, because paging, the tab groups and search all run
// against the full table in the database.
//
// `reloadToken` is how a mutation tells whichever list is on screen to
// refetch: it changes, the list's effect re-runs, and the fresh page comes
// straight from the database.
export const SalesProvider = ({ children }) => {
  const { showToast } = useToast();
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [printData, setPrintData] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => setReloadToken((t) => t + 1), []);

  // Bumping the token is what tells whichever list is on screen to refetch.
  // The detail page watches it too, so a panel that already calls its own
  // refresh after an action would otherwise fetch the same record twice.
  const applyUpdated = useCallback((updated) => {
    if (!updated) return;
    setSelectedCustomer((prev) => (prev && prev.id === updated.id ? updated : prev));
    setReloadToken((t) => t + 1);
  }, []);

  const updateStatus = useCallback(
    async (id, _newStatus, updates = {}, actionText, _subText = '') => {
      void _subText;
      if (!id || !actionText) return;
      const call = ACTION_TO_SERVICE_CALL[actionText];
      if (!call) {
        showToast(`No backend mapping for action: ${actionText}`, 'error');
        return;
      }
      try {
        const updated = await call(id, updates);
        applyUpdated(updated);
        showToast(`Success: ${actionText}`);
      } catch (err) {
        showToast(err?.message || `Failed: ${actionText}`, 'error');
      }
    },
    [showToast, applyUpdated]
  );

  const addCustomer = useCallback(
    async (customerDraft) => {
      try {
        const record = await customerService.createRecommendation(customerDraft);
        setReloadToken((t) => t + 1);
        showToast('Recommendation Form Submitted Successfully!');
        return record;
      } catch (err) {
        showToast(err?.message || 'Failed to submit recommendation', 'error');
        throw err;
      }
    },
    [showToast]
  );

  const findByBarcode = useCallback(async (barcode) => {
    if (typeof barcode !== 'string' || !barcode.trim()) return null;
    return customerService.fetchCustomerByBarcode(barcode.trim());
  }, []);

  const updateCustomerMeta = useCallback(
    async (id, updates = {}) => {
      try {
        const updated = await customerService.updateFollowUp(id, updates.followUpDate, updates.followUpNote);
        applyUpdated(updated);
        return updated;
      } catch (err) {
        showToast(err?.message || 'Failed to update follow-up', 'error');
        throw err;
      }
    },
    [showToast, applyUpdated]
  );

  const value = useMemo(
    () => ({
      selectedCustomer,
      setSelectedCustomer,
      printData,
      setPrintData,
      reloadToken,
      reload,
      updateStatus,
      updateCustomerMeta,
      addCustomer,
      findByBarcode,
    }),
    [selectedCustomer, printData, reloadToken, reload, updateStatus, updateCustomerMeta, addCustomer, findByBarcode]
  );

  return <SalesContext.Provider value={value}>{children}</SalesContext.Provider>;
};