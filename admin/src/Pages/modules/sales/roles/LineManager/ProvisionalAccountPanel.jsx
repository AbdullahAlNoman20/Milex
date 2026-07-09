// src/Pages/modules/sales/roles/LineManager/ProvisionalAccountPanel.jsx
import React, { useCallback } from 'react';
import { useSales } from '../../hooks/useSales';
import { useToast } from '../../../../../Components/hooks/useToast';
import Countdown from '../../../../../Components/Shared/Countdown';
import { PROVISIONAL_RULES, STATUS } from '../../constants/salesStatus';
import { calculateProvisionalExpiry } from '../../services/customerService';

const ProvisionalAccountPanel = ({ customer }) => {
  const { updateStatus } = useSales();
  const { showToast } = useToast();

  const handleExpire = useCallback(() => {
    if (customer.status !== STATUS.PROVISIONAL_EXPIRED) {
      updateStatus(customer.id, STATUS.PROVISIONAL_EXPIRED, {}, 'PROVISIONAL ACCOUNT EXPIRED', 'Account auto-deactivated');
    }
  }, [customer.id, customer.status, updateStatus]);

  const handleExtend = () => {
    const extendedBy = (customer.provisionalExtensionDays || 0) + PROVISIONAL_RULES.LM_EXTENSION_DAYS;
    if (extendedBy > PROVISIONAL_RULES.LM_EXTENSION_DAYS) {
      return showToast(`Maximum extension of ${PROVISIONAL_RULES.LM_EXTENSION_DAYS} days already applied`, 'warning');
    }
    const newExpiry = calculateProvisionalExpiry(
      customer.provisionalCreatedAt,
      PROVISIONAL_RULES.VALIDITY_DAYS,
      extendedBy
    );
    updateStatus(
      customer.id,
      STATUS.PROVISIONAL_ACTIVE,
      { provisionalExpiryDate: newExpiry, provisionalExtensionDays: extendedBy },
      'PROVISIONAL ACCOUNT EXTENDED BY LM',
      `Extended by ${PROVISIONAL_RULES.LM_EXTENSION_DAYS} days`
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-purple-300 p-6 space-y-4">
      <h3 className="font-bold text-slate-900 text-base">Provisional Account</h3>
      <div className="bg-purple-50 border border-purple-100 rounded-lg p-4 text-center">
        <p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest mb-2">Time Remaining</p>
        <Countdown expiryDate={customer.provisionalExpiryDate} onExpire={handleExpire} className="text-purple-800" />
      </div>
      <button
        type="button"
        onClick={handleExtend}
        disabled={(customer.provisionalExtensionDays || 0) >= PROVISIONAL_RULES.LM_EXTENSION_DAYS}
        className="w-full bg-purple-600 text-white font-bold py-3 rounded-lg text-sm shadow-md hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Extend by {PROVISIONAL_RULES.LM_EXTENSION_DAYS} Days
      </button>
    </div>
  );
};

export default ProvisionalAccountPanel;