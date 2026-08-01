// admin/src/Components/Shared/ChangePasswordModal.jsx 
import { useState } from 'react';
import { X, KeyRound, Loader2 } from 'lucide-react';
import { changePassword } from '../services/authService';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';

const ChangePasswordModal = ({ onClose }) => {
  const { showToast } = useToast();
  const { logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (!currentPassword || !newPassword) {
      return showToast('Fill in all fields', 'warning');
    }
    if (newPassword !== confirmPassword) {
      return showToast('New password and confirmation do not match', 'warning');
    }
    setIsSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      showToast('Password changed — please log in again', 'success');
      await logout();
      window.location.href = '/login';
    } catch (err) {
      showToast(err?.message || 'Failed to change password', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <KeyRound size={16} className="text-emerald-600" /> Change Password
          </h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-700 transition">
            <X size={16} />
          </button>
        </div>
        <input
          type="password"
          className="w-full border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:border-emerald-500"
          placeholder="Current password"
          value={currentPassword}
          maxLength={200}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
        <input
          type="password"
          className="w-full border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:border-emerald-500"
          placeholder="New password"
          value={newPassword}
          maxLength={200}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <input
          type="password"
          className="w-full border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:border-emerald-500"
          placeholder="Confirm new password"
          value={confirmPassword}
          maxLength={200}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        <p className="text-[10px] text-slate-400">Must be 8+ characters with upper, lower, number, and special character.</p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="flex-1 bg-emerald-700 text-white font-bold py-2.5 rounded-lg text-sm disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Change Password'}
          </button>
          <button type="button" onClick={onClose} className="px-4 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordModal;