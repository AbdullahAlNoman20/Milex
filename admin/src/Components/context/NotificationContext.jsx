// src/Components/context/NotificationContext.jsx
import React, { createContext, useMemo, useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSales } from '../../Pages/modules/sales/hooks/useSales';
import { ROLES } from '../constants/roles';
import { STATUS } from '../../Pages/modules/sales/constants/salesStatus';
import { WEEKLY_PLAN_STATUS } from '../../Pages/modules/sales/constants/weeklyPlanStatus';
import { listPlansForReview, listPlansForKam } from '../../Pages/modules/sales/services/weeklyPlanService';

export const NotificationContext = createContext(null);

const REFRESH_INTERVAL_MS = 15000;

export const NotificationProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const { customers } = useSales();
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setRefreshTick((t) => t + 1), REFRESH_INTERVAL_MS);
    const onFocus = () => setRefreshTick((t) => t + 1);
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const notifications = useMemo(() => {
    if (!currentUser?.role) return [];
    const role = currentUser.role;
    const items = [];

    if (role === ROLES.LINE_MANAGER) {
      customers
        .filter((c) => [STATUS.PENDING_APPROVAL, STATUS.INFO_UPDATE_PENDING].includes(c.status))
        .forEach((c) =>
          items.push({
            id: `cust-${c.id}`,
            label: `${c.accountName} — ${c.status}`,
            link: `/app/customers/${c.barcode}`,
          })
        );
      listPlansForReview().forEach((p) =>
        items.push({
          id: `plan-${p.id}`,
          label: `Weekly plan pending review — ${p.kamName}`,
          link: `/app/weekly-plans/review`,
        })
      );
    }

    if (role === ROLES.KAM) {
      customers
        .filter(
          (c) =>
            c.handledBy === currentUser.name &&
            [STATUS.OFFER_REVIEW, STATUS.AGREEMENT_REVIEW, STATUS.PENDING_PROFILE].includes(c.status)
        )
        .forEach((c) =>
          items.push({
            id: `cust-${c.id}`,
            label: `${c.accountName} — ${c.status}`,
            link: `/app/customers/${c.barcode}`,
          })
        );
      listPlansForKam(currentUser.id)
        .filter((p) => p.status === WEEKLY_PLAN_STATUS.NEEDS_REVISION)
        .forEach((p) =>
          items.push({
            id: `plan-${p.id}`,
            label: 'Weekly plan needs revision',
            link: `/app/weekly-plans`,
          })
        );
    }

    if (role === ROLES.SALES_COORDINATOR) {
      customers
        .filter((c) =>
          [STATUS.APPROVED_PENDING_OFFER, STATUS.PENDING_AGREEMENT].includes(c.status)
        )
        .forEach((c) =>
          items.push({
            id: `cust-${c.id}`,
            label: `${c.accountName} — ${c.status}`,
            link: `/app/customers/${c.barcode}`,
          })
        );
    }

    return items.slice(0, 20);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customers, currentUser, refreshTick]);

  const refresh = useCallback(() => setRefreshTick((t) => t + 1), []);

  const value = useMemo(() => ({ notifications, count: notifications.length, refresh }), [notifications, refresh]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};