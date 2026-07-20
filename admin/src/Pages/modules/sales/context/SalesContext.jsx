import { useState, useCallback, useMemo, useEffect } from 'react';
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
  'OFFER LETTER SENT': (id, updates) => customerService.finalizeOffer(id, updates.offerText),
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
};

export const SalesProvider = ({ children }) => {
  const { showToast } = useToast();
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [printData, setPrintData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const reload = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const data = await customerService.fetchCustomers({ pageSize: '300' });
      setCustomers(Array.isArray(data) ? data : []);
    } catch {
      setLoadError('Failed to load customer records.');
    } finally {
      setIsLoading(false);
    }
  }, []);

useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  // Every role panel calls updateStatus(id, newStatus, updates, actionText, subText)
  // exactly as before — this now forwards to the real backend endpoint that
  // matches the actionText, then refetches so all roles see the live result.
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
        setCustomers((prev) => prev.map((c) => (c.id === id ? updated : c)));
        setSelectedCustomer((prev) => (prev && prev.id === id ? updated : prev));
        showToast(`Success: ${actionText}`);
      } catch (err) {
        showToast(err?.message || `Failed: ${actionText}`, 'error');
      }
    },
    [showToast]
  );

  const addCustomer = useCallback(
    async (customerDraft) => {
      try {
        const record = await customerService.createRecommendation(customerDraft);
        setCustomers((prev) => [...prev, record]);
        showToast('Recommendation Form Submitted Successfully!');
        return record;
      } catch (err) {
        showToast(err?.message || 'Failed to submit recommendation', 'error');
        throw err;
      }
    },
    [showToast]
  );

  const findByBarcode = useCallback(
    async (barcode) => {
      if (typeof barcode !== 'string' || !barcode.trim()) return null;
      try {
        return await customerService.fetchCustomerByBarcode(barcode.trim());
      } catch {
        return null;
      }
    },
    []
  );

  const updateCustomerMeta = useCallback(
    async (id, updates = {}) => {
      try {
        const updated = await customerService.updateFollowUp(id, updates.followUpDate, updates.followUpNote);
        setCustomers((prev) => prev.map((c) => (c.id === id ? updated : c)));
        setSelectedCustomer((prev) => (prev && prev.id === id ? updated : prev));
      } catch (err) {
        showToast(err?.message || 'Failed to update follow-up', 'error');
      }
    },
    [showToast]
  );

  const value = useMemo(
    () => ({
      customers,
      isLoading,
      loadError,
      selectedCustomer,
      setSelectedCustomer,
      printData,
      setPrintData,
      updateStatus,
      updateCustomerMeta,
      addCustomer,
      findByBarcode,
      reload,
    }),
    [customers, isLoading, loadError, selectedCustomer, printData, updateStatus, updateCustomerMeta, addCustomer, findByBarcode, reload]
  );

  return <SalesContext.Provider value={value}>{children}</SalesContext.Provider>;
};