// admin/src/Components/Shared/ChangePasswordModal.jsx
import { useState, useRef } from 'react';
import { X, KeyRound, Loader2 } from 'lucide-react';
import { changePassword } from '../services/authService';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';

// `forced` is set when an administrator required a password change on next
// login — the modal then cannot be dismissed until a new password is set.
const ChangePasswordModal = ({ onClose, forced = false }) => {
  const { showToast } = useToast();
  const { logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLockRef = useRef(false);

  const handleSubmit = async () => {
    if (submitLockRef.current) return;
    if (!currentPassword || !newPassword) {
      return showToast('Fill in all fields', 'warning');
    }
    if (newPassword !== confirmPassword) {
      return showToast('New password and confirmation do not match', 'warning');
    }
    submitLockRef.current = true;
    setIsSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      showToast('Password changed — please log in again', 'success');
      await logout();
      window.location.href = '/login';
    } catch (err) {
      showToast(err?.message || 'Failed to change password', 'error');
    } finally {
      submitLockRef.current = false;
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
          {!forced && (
            <button type="button" onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-700 transition">
              <X size={16} />
            </button>
          )}
        </div>
        {forced && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
            Your administrator set a temporary password for you. Please choose your own password to continue.
          </p>
        )}
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
          {!forced && (
            <button type="button" onClick={onClose} className="px-4 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold">
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordModal;