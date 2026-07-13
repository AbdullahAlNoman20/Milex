// admin/src/Pages/modules/sales/roles/LineManager/ProvisionalAccountPanel.jsx — REPLACE ENTIRE FILE
import React, { useCallback, useState } from 'react';
import Countdown from '../../../../../Components/Shared/Countdown';

const ProvisionalAccountPanel = ({ customer }) => {
  const [expired, setExpired] = useState(false);

  const handleExpire = useCallback(() => {
    setExpired(true);
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-purple-300 p-6 space-y-4">
      <h3 className="font-bold text-slate-900 text-base">Provisional Account</h3>
      <div className="bg-purple-50 border border-purple-100 rounded-lg p-4 text-center">
        <p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest mb-2">Time Remaining</p>
        <Countdown expiryDate={customer.provisionalExpiryDate} onExpire={handleExpire} className="text-purple-800" />
      </div>
      {expired && (
        <p className="text-[11px] text-red-600 font-semibold text-center">
          Document upload window has ended. Awaiting system deactivation or an approved extension.
        </p>
      )}
    </div>
  );
};

export default ProvisionalAccountPanel;