// src/Pages/modules/sales/context/SalesContext.jsx
import React, { createContext, useState, useCallback, useMemo, useEffect } from 'react';
import { useToast } from '../../../../Components/hooks/useToast';
import {
  fetchCustomers,
  generateBarcode,
  buildHistoryEntry,
} from '../services/customerService';
import { STATUS } from '../constants/salesStatus';

export const SalesContext = createContext(null);

export const SalesProvider = ({ children }) => {
  const { showToast } = useToast();
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [printData, setPrintData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        const data = await fetchCustomers();
        if (isMounted) setCustomers(Array.isArray(data) ? data : []);
      } catch (err) {
        if (isMounted) setLoadError('Failed to load customer records.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const updateStatus = useCallback(
    (id, newStatus, updates = {}, actionText, subText = '') => {
      if (!id || !newStatus || !actionText) return;

      const historyEntry = buildHistoryEntry(actionText, subText);

      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id !== id) return c;
          const closedHistory = (c.history || []).map((h) => ({ ...h, status: 'completed' }));
          return {
            ...c,
            ...updates,
            status: newStatus,
            history: [historyEntry, ...closedHistory],
          };
        })
      );

      setSelectedCustomer((prev) => {
        if (!prev || prev.id !== id) return prev;
        const closedHistory = (prev.history || []).map((h) => ({ ...h, status: 'completed' }));
        return {
          ...prev,
          ...updates,
          status: newStatus,
          history: [historyEntry, ...closedHistory],
        };
      });

      showToast(`Success: ${actionText}`);
    },
    [showToast]
  );

  const addCustomer = useCallback(
    (customerDraft) => {
      const id = generateBarcode();
      const record = {
        id,
        barcode: id,
        revision: 0,
        accountProfileType: 'REGULAR',
        profileData: {},
        history: [buildHistoryEntry('RECOMMENDATION FORM CREATED BY KAM')],
        status: STATUS.PENDING_RATE,
        ...customerDraft,
      };
      setCustomers((prev) => [...prev, record]);
      showToast('Recommendation Form Submitted Successfully!');
      return record;
    },
    [showToast]
  );

const findByBarcode = useCallback(
    (barcode) => {
      if (typeof barcode !== 'string' || !barcode.trim()) return null;
      const normalized = barcode.trim().toLowerCase();
      return customers.find((c) => c.barcode?.toLowerCase() === normalized) || null;
    },
    [customers]
  );

  const updateCustomerMeta = useCallback((id, updates = {}) => {
    if (!id || typeof updates !== 'object') return;
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    setSelectedCustomer((prev) => (prev && prev.id === id ? { ...prev, ...updates } : prev));
  }, []);

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
      generateBarcode,
    }),
    [customers, isLoading, loadError, selectedCustomer, printData, updateStatus, updateCustomerMeta, addCustomer, findByBarcode]
  );

  return <SalesContext.Provider value={value}>{children}</SalesContext.Provider>;
};