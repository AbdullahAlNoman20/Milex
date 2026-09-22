// src/Pages/modules/operations/components/OperationsProfileModal.jsx
import { useState } from 'react';
import { X } from 'lucide-react';
import { useOperationsAuth } from '../hooks/useOperationsAuth';
import { useToast } from '../../../../Components/hooks/useToast';
import { isRequired } from '../../../../Components/utils/validators';

const MAX_AVATAR_SIZE = 1.5 * 1024 * 1024;

const OperationsProfileModal = ({ onClose }) => {
  const { currentUser, changePassword, updateAvatar } = useOperationsAuth();
  const { showToast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!isRequired(currentPassword) || !isRequired(newPassword)) return showToast('Fill in all password fields', 'warning');
    if (newPassword.length < 6) return showToast('New password must be at least 6 characters', 'warning');
    if (newPassword !== confirmPassword) return showToast('New passwords do not match', 'warning');

    setIsSavingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      showToast('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      showToast(err?.message || 'Failed to update password', 'error');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_AVATAR_SIZE) return showToast('Image must be under 1.5MB', 'warning');
    if (!['image/jpeg', 'image/png'].includes(file.type)) return showToast('Only JPG or PNG allowed', 'warning');

    setIsUploadingAvatar(true);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Could not read image'));
        reader.readAsDataURL(file);
      });
      await updateAvatar(dataUrl);
      showToast('Profile picture updated');
    } catch (err) {
      showToast(err?.message || 'Failed to update profile picture', 'error');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative">
        <button type="button" onClick={onClose} aria-label="Close" className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
          <X size={18} />
        </button>
        <h2 className="text-sm font-black text-slate-800 uppercase tracking-wide mb-4">My Profile</h2>

        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
            {currentUser?.avatarDataUrl ? (
              <img src={currentUser.avatarDataUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-lg font-black text-slate-400">{currentUser?.name?.charAt(0) || '?'}</span>
            )}
          </div>
          <label className="text-xs font-bold text-emerald-600 hover:underline cursor-pointer">
            {isUploadingAvatar ? 'Uploading...' : 'Change Picture'}
            <input type="file" accept=".jpg,.jpeg,.png" className="hidden" disabled={isUploadingAvatar} onChange={handleAvatarChange} />
          </label>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Change Password</p>
          <input type="password" placeholder="Current Password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} disabled={isSavingPassword} maxLength={200} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-50 focus:border-emerald-500 outline-none disabled:opacity-60" />
          <input type="password" placeholder="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={isSavingPassword} maxLength={200} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-50 focus:border-emerald-500 outline-none disabled:opacity-60" />
          <input type="password" placeholder="Confirm New Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={isSavingPassword} maxLength={200} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-50 focus:border-emerald-500 outline-none disabled:opacity-60" />
          <button type="submit" disabled={isSavingPassword} className="w-full bg-emerald-600 text-white font-bold py-2.5 rounded-lg hover:bg-emerald-700 transition disabled:opacity-50">
            {isSavingPassword ? 'Saving...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default OperationsProfileModal;