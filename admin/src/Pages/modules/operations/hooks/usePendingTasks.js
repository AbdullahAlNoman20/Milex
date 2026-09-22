// src/Pages/modules/operations/hooks/usePendingTasks.js
import { useState, useEffect, useCallback } from 'react';
import { useOperationsAuth } from './useOperationsAuth';
import { fetchShipments } from '../services/shipmentService';
import { fetchRequests, REQUEST_STATUS } from '../services/requestService';
import { OPERATIONS_ROLES } from '../constants/operationsRoles';
import { getAllowedNextSteps, getStatusIndex } from '../constants/shipmentStatus';

// Central "what needs MY action right now" query, shared by the sidebar
// task counter, the notification indicator in the header, and My Tasks page.
export const usePendingTasks = () => {
  const { currentUser } = useOperationsAuth();
  const [shipmentTasks, setShipmentTasks] = useState([]);
  const [requestTasks, setRequestTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!currentUser?.role) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const shipments = await fetchShipments();
      const myShipmentTasks = shipments.filter((s) => {
        const idx = getStatusIndex(s.shipmentMode, s.statusCode);
        return getAllowedNextSteps(currentUser.role, s.shipmentMode, idx).length > 0;
      });
      setShipmentTasks(myShipmentTasks);

      if (currentUser.role === OPERATIONS_ROLES.OPERATIONS_HEAD) {
        const requests = await fetchRequests();
        setRequestTasks(requests.filter((r) => r.status === REQUEST_STATUS.PENDING));
      } else {
        setRequestTasks([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { load(); }, [load]);

  return {
    shipmentTasks,
    requestTasks,
    totalCount: shipmentTasks.length + requestTasks.length,
    isLoading,
    reload: load,
  };
};