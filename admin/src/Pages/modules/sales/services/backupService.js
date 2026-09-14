// admin/src/Pages/modules/sales/services/backupService.js
import { request, API_BASE_URL } from '../../../../Components/services/api';

export const getBackupStats = async () => {
  const { data } = await request('/backup/stats');
  return data;
};

const getCsrfToken = () => {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
};

// Downloaded as a stream rather than through request(), because a full
// backup can be far larger than a normal API response and has its own
// filename/Content-Disposition handling.
export const downloadBackup = async (includeFiles = true) => {
  const res = await fetch(`${API_BASE_URL}/backup/download?includeFiles=${includeFiles ? 'true' : 'false'}`, {
    method: 'GET',
    credentials: 'include',
    headers: { ...(getCsrfToken() ? { 'x-csrf-token': getCsrfToken() } : {}) },
  });
  if (!res.ok) {
    let message = 'We couldn\'t create the backup. Please try again in a moment.';
    try {
      const json = await res.json();
      if (json?.error?.message) message = json.error.message;
    } catch {
      /* non-JSON error page */
    }
    throw new Error(message);
  }
  const blob = await res.blob();
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `milex-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return true;
};

export const restoreBackup = async (backup, confirm) => {
  const res = await fetch(`${API_BASE_URL}/backup/restore`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(getCsrfToken() ? { 'x-csrf-token': getCsrfToken() } : {}),
    },
    body: JSON.stringify({ backup, confirm }),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  if (!res.ok || !json?.success) {
    throw new Error(json?.error?.message || 'The restore could not be completed. Your current data has not been changed.');
  }
  return json.data;
};