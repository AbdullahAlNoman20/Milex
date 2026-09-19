// admin/src/Pages/modules/sales/hooks/usePagedCustomers.js
import { useState, useEffect, useRef } from 'react';
import { fetchCustomerPage } from '../services/customerService';

// Typing shouldn't fire a request per keystroke. An empty search skips the
// delay entirely so tab switches and page changes stay instant.
const SEARCH_DEBOUNCE_MS = 350;

const EMPTY = { items: [], total: 0, totalPages: 1, counts: null };

export const usePagedCustomers = ({
  group,
  page = 1,
  pageSize = 10,
  search = '',
  status,
  withCounts = false,
  reloadToken = 0,
}) => {
  const [data, setData] = useState(EMPTY);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  // Guards against an older, slower response overwriting a newer one — the
  // classic out-of-order problem when someone types faster than the network.
  const requestIdRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const requestId = ++requestIdRef.current;

    const timer = setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await fetchCustomerPage({ page, pageSize, group, search, status, withCounts });
        if (cancelled || requestId !== requestIdRef.current) return;
        setData(result);
      } catch (err) {
        if (cancelled || requestId !== requestIdRef.current) return;
        setData(EMPTY);
        setError(err?.message || 'Failed to load customer records.');
      } finally {
        if (!cancelled && requestId === requestIdRef.current) setIsLoading(false);
      }
    }, search.trim() ? SEARCH_DEBOUNCE_MS : 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [group, page, pageSize, search, status, withCounts, reloadToken]);

  return { ...data, isLoading, error };
};