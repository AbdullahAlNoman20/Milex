// admin/src/Pages/modules/sales/components/AdminCustomerActions.jsx
import { useState, useEffect, useRef } from 'react';
import { UserCog, Trash2, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { listKams } from "../services/teamService";
import { deleteCustomer, reassignCustomer } from "../services/customerService";
import { useToast } from "../../../../Components/hooks/useToast";
import { useConfirm } from "../../../../Components/hooks/useConfirm";
import { useAuth } from "../../../../Components/hooks/useAuth";
import { ROLES } from "../../../../Components/constants/roles";

// Reassigning a customer is a normal management action; removing one is not,
// so only a Super Admin ever sees that button.
const AdminCustomerActions = ({ customer, onChanged }) => {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [kams, setKams] = useState([]);
  const [selectedKam, setSelectedKam] = useState("");
  const [isReassigning, setIsReassigning] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showReassign, setShowReassign] = useState(false);
  const actionLockRef = useRef(false);
  const canDelete = currentUser?.role === ROLES.SUPER_ADMIN;

  useEffect(() => {
    if (showReassign && kams.length === 0) {
      listKams()
        .then(setKams)
        .catch(() => setKams([]));
    }
  }, [showReassign, kams.length]);

  const handleReassign = async () => {
    if (actionLockRef.current) return;
    if (!selectedKam) return showToast('Select a KAM to reassign to', 'warning');
    const target = kams.find((k) => k.id === selectedKam);
    const ok = await confirm({
      title: 'Reassign this customer?',
      message: `${customer.accountName} will move to ${target?.name || 'the selected KAM'}. The previous KAM will no longer see this record in their own list.`,
      confirmLabel: 'Reassign',
    });
    if (!ok) return;
    actionLockRef.current = true;
    setIsReassigning(true);
    try {
      await reassignCustomer(customer.id, selectedKam);
      showToast('Customer reassigned', 'success');
      setShowReassign(false);
      onChanged?.();
    } catch (err) {
      showToast(err?.message || 'Failed to reassign', 'error');
    } finally {
      actionLockRef.current = false;
      setIsReassigning(false);
    }
  };

  const handleDelete = async () => {
    if (actionLockRef.current) return;
    const ok = await confirm({
      title: 'Delete this customer?',
      message: `"${customer.accountName}" will be removed from every list and can only be brought back from a database backup. This cannot be undone from here.`,
      confirmLabel: 'Delete customer',
      tone: 'danger',
    });
    if (!ok) return;
    actionLockRef.current = true;
    setIsDeleting(true);
    try {
      await deleteCustomer(customer.id);
      showToast('Customer deleted', 'success');
      navigate('/app/customers');
    } catch (err) {
      showToast(err?.message || 'Failed to delete', 'error');
      actionLockRef.current = false;
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-red-200 p-5 space-y-3">
      <h3 className="font-bold text-slate-900 text-sm flex items-center">
        <UserCog size={16} className="mr-2 text-red-500" /> Customer Assignment
      </h3>
      <p className="text-[11px] text-slate-500">
        Currently handled by <strong>{customer.handledBy?.name || 'nobody'}</strong>. 
      </p>
      {!showReassign ? (
        <button
          type="button"
          onClick={() => setShowReassign(true)}
          className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 py-2 rounded-lg hover:bg-slate-100 transition"
        >
          Reassign to Another KAM
        </button>
      ) : (
        <div className="space-y-2">
          <select
            className="w-full border border-slate-200 p-2 rounded text-xs bg-white outline-none focus:border-emerald-500"
            value={selectedKam}
            onChange={(e) => setSelectedKam(e.target.value)}
          >
            <option value="">Select KAM...</option>
            {kams.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isReassigning}
              onClick={handleReassign}
              className="flex-1 bg-emerald-600 text-white text-xs font-bold py-2 rounded disabled:opacity-50"
            >
              {isReassigning ? (
                <Loader2 size={12} className="animate-spin mx-auto" />
              ) : (
                "Confirm Reassign"
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowReassign(false)}
              className="px-3 bg-slate-100 text-slate-600 rounded text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {canDelete && (
      <button
        type="button"
        disabled={isDeleting}
        onClick={handleDelete}
        className="w-full text-xs font-bold text-red-600 bg-red-50 border border-red-200 py-2 rounded-lg hover:bg-red-100 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
      >
        {isDeleting ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <Trash2 size={12} />
        )}
        Delete Customer
      </button>
      )}
    </div>
  );
};

export default AdminCustomerActions;
