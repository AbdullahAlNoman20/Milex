// src/Pages/modules/operations/hooks/useClientNotifications.js
import { useState, useEffect, useCallback } from 'react';
import { useOperationsAuth } from './useOperationsAuth';
import { fetchRequestsByClientEmail } from '../services/requestService';

// Powers the Client's "Notifications" header indicator — count of Operations
// Head document/info requests the client hasn't read yet.
export const useClientNotifications = () => {
  const { currentUser } = useOperationsAuth();
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!currentUser?.email) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      setRequests(await fetchRequestsByClientEmail(currentUser.email));
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { load(); }, [load]);

  const unreadCount = requests.filter((r) => r.headMessage && !r.headMessageRead).length;

  return { unreadCount, requests, isLoading, reload: load };
};