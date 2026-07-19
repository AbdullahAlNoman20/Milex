// admin/src/Pages/modules/sales/roles/KAM/AgreementSignedPanel.jsx
import React, { useState } from "react";
import { FileSignature, PackageCheck, UserCheck } from "lucide-react";
import { useSales } from "../../hooks/useSales";

const AgreementSignedPanel = ({ customer }) => {
  const { updateStatus } = useSales();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleProvisional = async () => {
    setIsSubmitting(true);
    await updateStatus(
      customer.id,
      "PROVISIONAL_ACTIVE",
      {},
      "AGREEMENT SIGNED — PROVISIONAL ACCOUNT CREATED",
      "21-day document upload window started",
    );
    setIsSubmitting(false);
  };

  const handleDirect = async () => {
    setIsSubmitting(true);
    await updateStatus(
      customer.id,
      "ACTIVE_ACCOUNT",
      {},
      "AGREEMENT SIGNED — ACCOUNT ACTIVATED",
    );
    setIsSubmitting(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-emerald-600 p-6 space-y-4">
      <h3 className="font-bold text-slate-900 text-base flex items-center">
        <FileSignature size={18} className="mr-2 text-emerald-600" /> Agreement
        Signed
      </h3>
      <p className="text-xs text-slate-500 leading-relaxed">
        Confirm the signed agreement has been received from the customer, then
        choose how to create the account.
      </p>
      <button
        type="button"
        disabled={isSubmitting}
        onClick={handleProvisional}
        className="w-full bg-purple-600 text-white font-bold py-3 rounded-lg text-sm shadow hover:bg-purple-700 transition disabled:opacity-50 flex items-center justify-center"
      >
        <PackageCheck size={16} className="mr-2" /> Create Provisional Account
        (Docs Required)
      </button>
      <button
        type="button"
        disabled={isSubmitting}
        onClick={handleDirect}
        className="w-full bg-emerald-700 text-white font-bold py-3 rounded-lg text-sm shadow-md hover:bg-emerald-800 transition disabled:opacity-50 flex items-center justify-center"
      >
        <UserCheck size={16} className="mr-2" /> Activate Directly
      </button>
    </div>
  );
};

export default AgreementSignedPanel;
