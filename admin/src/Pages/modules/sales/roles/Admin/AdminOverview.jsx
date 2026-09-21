// admin/src/Pages/modules/sales/roles/Admin/AdminOverview.jsx
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  Users,
  Plus,
  KeyRound,
  Loader2,
  ShieldCheck,
  Download,
  RefreshCw,
  Search,
  X,
  Copy,
  Bell,
  UserPlus,
  DatabaseBackup,
  UploadCloud,
  HardDrive,
  AlertTriangle,
  FileSpreadsheet,
} from 'lucide-react';
import { useToast } from '../../../../../Components/hooks/useToast';
import { downloadCsv } from '../../../../../Components/utils/csv';
import {
  listAllUsers,
  getUserStats,
  listLineManagers,
  createUserAdmin,
  updateUserAdmin,
  setUserPasswordAdmin,
} from '../../services/userAdminService';
import { getBackupStats, downloadBackup, restoreBackup } from '../../services/backupService';
import BulkImportKamModal from './BulkImportKamModal';
import PasswordField from '../../../../../Components/Shared/PasswordField';
import { PASSWORD_RULES } from '../../../../../Components/Shared/passwordRules';
import { useConfirm } from '../../../../../Components/hooks/useConfirm';
import Pagination from '../../../../../Components/Shared/Pagination';

// Used only for displaying an existing account's role.
const ROLE_OPTIONS = [
  { value: 'KAM', label: 'KAM' },
  { value: 'SALES_COORDINATOR', label: 'Sales Coordinator' },
  { value: 'LINE_MANAGER', label: 'Line Manager' },
  { value: 'HEAD_OF_DEPARTMENT', label: 'Head of Department' },
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'CUSTOMER', label: 'Customer' },
];

// Roles that may actually be assigned. Super Admin is absent on purpose:
// the system's Super Admin is provisioned once at setup and no further one
// is ever created or promoted from this console. The server enforces the
// same rule, so removing it here is presentation, not the safeguard.
// A customer login is created by the system when their account goes active,
// so it is shown on existing rows but never offered as something to assign.
const ASSIGNABLE_ROLE_OPTIONS = ROLE_OPTIONS.filter(
  (r) => r.value !== 'SUPER_ADMIN' && r.value !== 'CUSTOMER'
);

const ROLE_BADGE_STYLE = {
  SUPER_ADMIN: 'bg-violet-100 text-violet-700 ring-violet-200',
  HEAD_OF_DEPARTMENT: 'bg-indigo-100 text-indigo-700 ring-indigo-200',
  LINE_MANAGER: 'bg-blue-100 text-blue-700 ring-blue-200',
  SALES_COORDINATOR: 'bg-amber-100 text-amber-700 ring-amber-200',
  KAM: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  CUSTOMER: 'bg-slate-100 text-slate-600 ring-slate-200',
};

const ROLE_DONUT_COLOR = {
  SUPER_ADMIN: '#7C3AED',
  HEAD_OF_DEPARTMENT: '#4F46E5',
  LINE_MANAGER: '#2563EB',
  SALES_COORDINATOR: '#F59E0B',
  KAM: '#059669',
  CUSTOMER: '#94A3B8',
};

const roleLabel = (value) => ROLE_OPTIONS.find((r) => r.value === value)?.label || value;

const emptyForm = { name: '', email: '', password: '', role: 'KAM', lineManagerId: '' };

const PAGE_SIZE = 10;
const EXPORT_PAGE_SIZE = 500;
const SEARCH_DEBOUNCE_MS = 350;

// Cryptographically random rather than Math.random(): a predictable
// temporary password is guessable by anyone who knows roughly when the
// account was created.
// One character is drawn from each required class FIRST, then the rest at
// random, then the whole thing is shuffled.
const PASSWORD_SETS = Object.freeze({
  upper: 'ABCDEFGHJKLMNPQRSTUVWXYZ',
  lower: 'abcdefghijkmnpqrstuvwxyz',
  digit: '23456789',
  special: '!@#$%^&*?-_',
});
const PASSWORD_ALPHABET = Object.values(PASSWORD_SETS).join('');
const PASSWORD_LENGTH = 16;

const randomInt = (max) => {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % max;
};

const generatePassword = () => {
  const chars = Object.values(PASSWORD_SETS).map((set) => set[randomInt(set.length)]);
  while (chars.length < PASSWORD_LENGTH) {
    chars.push(PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)]);
  }
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
};

const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

const trendFromSeries = (series) => {
  if (!Array.isArray(series) || series.length < 2) return null;
  const prev = series[series.length - 2];
  const curr = series[series.length - 1];
  if (prev === 0) return curr === 0 ? { value: '0.0', up: true } : { value: '100.0', up: true };
  const pct = ((curr - prev) / prev) * 100;
  return { value: Math.abs(pct).toFixed(1), up: pct >= 0 };
};

const Sparkline = ({ series = [], up }) => {
  const points = series.length > 0 ? series : [0, 0];
  const max = Math.max(1, ...points);
  const step = points.length > 1 ? 100 / (points.length - 1) : 100;
  const coords = points.map((v, i) => `${(i * step).toFixed(1)},${(24 - (v / max) * 22).toFixed(1)}`).join(' ');
  return (
    <svg viewBox="0 0 100 24" className="w-full h-6 mt-2" preserveAspectRatio="none">
      <polyline points={coords} fill="none" stroke={up === false ? '#EF4444' : '#059669'} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
};

const StatCard = ({ icon: Icon, label, value, trend, series, iconBg }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)] min-w-0">
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
          <Icon size={15} />
        </div>
        <p className="text-xs font-bold text-slate-600 truncate">{label}</p>
      </div>
      {trend && (
        <span
          title="Change compared with last month"
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
            trend.up ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
          }`}
        >
          {trend.up ? '▲' : '▼'} {trend.value}%
        </span>
      )}
    </div>
    <p className="text-2xl font-bold text-slate-800 mt-2">{value}</p>
    <Sparkline series={series} up={trend ? trend.up : true} />
  </div>
);

const Donut = ({ segments, size = 72, thickness = 12 }) => {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const stops = segments
    .reduce((acc, seg) => {
      const prevEnd = acc.length ? acc[acc.length - 1].end : 0;
      const start = (prevEnd / total) * 360;
      const end = ((prevEnd + seg.value) / total) * 360;
      acc.push({ color: seg.color, start, end });
      return acc;
    }, [])
    .map((s) => `${s.color} ${s.start}deg ${s.end}deg`)
    .join(', ');
  return (
    <div className="rounded-full shrink-0" style={{ width: size, height: size, background: `conic-gradient(${stops})` }}>
      <div
        className="rounded-full bg-white flex items-center justify-center"
        style={{ width: size - thickness * 2, height: size - thickness * 2, margin: thickness }}
      />
    </div>
  );
};

const StatusPill = ({ isActive }) =>
  isActive ? (
    <span className="inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset bg-emerald-50 text-emerald-700 ring-emerald-200">
      Active
    </span>
  ) : (
    <span className="inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset bg-slate-100 text-slate-500 ring-slate-200">
      Deactivated
    </span>
  );

const Avatar = ({ name }) => {
  const initials = (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
  return (
    <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0 ring-1 ring-inset ring-emerald-100">
      {initials || <Users size={14} />}
    </div>
  );
};

const AdminOverview = () => {
  const { showToast } = useToast();
  const confirm = useConfirm();

  const [stats, setStats] = useState(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [lineManagers, setLineManagers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTableLoading, setIsTableLoading] = useState(true);

  const [form, setForm] = useState(emptyForm);
  const [isCreating, setIsCreating] = useState(false);
  const createLockRef = useRef(false);
  const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false);
  const [passwordTargetId, setPasswordTargetId] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const savePasswordLockRef = useRef(false);
  const [requireChangeOnLogin, setRequireChangeOnLogin] = useState(true);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [reloadToken, setReloadToken] = useState(0);
  const requestIdRef = useRef(0);
  const [isExporting, setIsExporting] = useState(false);

  // --- System maintenance ---
  const [backupStats, setBackupStats] = useState(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreFile, setRestoreFile] = useState(null);
  const [restoreConfirm, setRestoreConfirm] = useState('');
  const [isRestorePanelOpen, setIsRestorePanelOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const backupLockRef = useRef(false);

  // Typing shouldn't fire a request per keystroke; every other narrowing
  // control applies immediately.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, search ? SEARCH_DEBOUNCE_MS : 0);
    return () => clearTimeout(timer);
  }, [search]);

  const loadStats = useCallback(async () => {
    try {
      setStats(await getUserStats());
    } catch (err) {
      showToast(err?.message || 'Failed to load user statistics', 'error');
    }
  }, [showToast]);

  const loadSupport = useCallback(async () => {
    try {
      setLineManagers(await listLineManagers());
    } catch (err) {
      showToast(err?.message || 'Failed to load Line Managers', 'error');
    }
    getBackupStats()
      .then(setBackupStats)
      .catch(() => setBackupStats(null));
  }, [showToast]);

  useEffect(() => {
    Promise.all([loadStats(), loadSupport()]).finally(() => setIsLoading(false));
  }, [loadStats, loadSupport, reloadToken]);

  // Guards against an older, slower response overwriting a newer one.
  useEffect(() => {
    let cancelled = false;
    const requestId = ++requestIdRef.current;
    setIsTableLoading(true);
    listAllUsers({ page, pageSize: PAGE_SIZE, search: debouncedSearch, role: roleFilter, status: statusFilter })
      .then((result) => {
        if (cancelled || requestId !== requestIdRef.current) return;
        setRows(result.items);
        setTotal(result.total);
        setTotalPages(result.totalPages);
      })
      .catch((err) => {
        if (cancelled || requestId !== requestIdRef.current) return;
        setRows([]);
        setTotal(0);
        setTotalPages(1);
        showToast(err?.message || 'Failed to load users', 'error');
      })
      .finally(() => {
        if (!cancelled && requestId === requestIdRef.current) setIsTableLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, debouncedSearch, roleFilter, statusFilter, reloadToken, showToast]);

  const reloadAll = useCallback(() => setReloadToken((t) => t + 1), []);

  const totalUsers = stats?.total ?? 0;
  const activeUsers = stats?.active ?? 0;
  const inactiveUsers = stats?.inactive ?? 0;

  const roleDistribution = useMemo(() => {
    const byRole = stats?.byRole || [];
    return ROLE_OPTIONS.map((r) => ({
      role: r.value,
      label: r.label,
      value: byRole.find((b) => b.role === r.value)?.count || 0,
      color: ROLE_DONUT_COLOR[r.value],
    })).filter((seg) => seg.value > 0);
  }, [stats]);

  const recentUsers = stats?.recent || [];

  const handleCreate = async () => {
    if (createLockRef.current) return;
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      return showToast('Name, email and password are required', 'warning');
    }
    createLockRef.current = true;
    setIsCreating(true);
    try {
      await createUserAdmin({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        lineManagerId: ['KAM', 'SALES_COORDINATOR'].includes(form.role) && form.lineManagerId ? form.lineManagerId : null,
      });
      showToast('User created — they will be asked to set their own password at first login', 'success');
      setForm(emptyForm);
      setIsCreatePanelOpen(false);
      setPage(1);
      reloadAll();
    } catch (err) {
      showToast(err?.message || 'Failed to create user', 'error');
    } finally {
      createLockRef.current = false;
      setIsCreating(false);
    }
  };

  const handleRoleChange = async (user, role) => {
    const ok = await confirm({
      title: 'Change this person\'s role?',
      message: `${user.name} will immediately gain the permissions of ${roleLabel(role)} and lose their current ones.`,
      confirmLabel: 'Change role',
    });
    if (!ok) return;
    try {
      await updateUserAdmin(user.id, { role });
      showToast('Role updated', 'success');
      reloadAll();
    } catch (err) {
      showToast(err?.message || 'Failed to update role', 'error');
    }
  };

  const handleLineManagerChange = async (user, lineManagerId) => {
    try {
      await updateUserAdmin(user.id, { lineManagerId: lineManagerId || null });
      showToast('Line Manager assignment updated', 'success');
      reloadAll();
    } catch (err) {
      showToast(err?.message || 'Failed to update assignment', 'error');
    }
  };

  const handleToggleActive = async (user) => {
    const ok = await confirm({
      title: user.isActive ? 'Deactivate this account?' : 'Reactivate this account?',
      message: user.isActive
        ? `${user.name} will be signed out and won't be able to log in until reactivated. Their records stay exactly as they are.`
        : `${user.name} will be able to log in again straight away.`,
      confirmLabel: user.isActive ? 'Deactivate' : 'Reactivate',
      tone: user.isActive ? 'danger' : 'default',
    });
    if (!ok) return;
    try {
      await updateUserAdmin(user.id, { isActive: !user.isActive });
      showToast(user.isActive ? 'User deactivated' : 'User reactivated', 'success');
      reloadAll();
    } catch (err) {
      showToast(err?.message || 'Failed to update user', 'error');
    }
  };

  const handleSavePassword = async () => {
    if (savePasswordLockRef.current) return;
    if (!newPassword.trim()) return showToast('Enter a new password', 'warning');
    savePasswordLockRef.current = true;
    setIsSavingPassword(true);
    try {
      await setUserPasswordAdmin(passwordTargetId, newPassword, requireChangeOnLogin);
      showToast(
        requireChangeOnLogin
          ? 'Password updated — they will be asked to set their own at next login'
          : 'Password updated',
        'success'
      );
      setPasswordTargetId(null);
      setNewPassword('');
      setRequireChangeOnLogin(true);
      reloadAll();
    } catch (err) {
      showToast(err?.message || 'Failed to set password', 'error');
    } finally {
      savePasswordLockRef.current = false;
      setIsSavingPassword(false);
    }
  };

  // Pages through the whole matching set rather than exporting only what is
  // currently on screen, so the file always holds every account the filters
  // describe — however many that is.
  const exportUsers = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const all = [];
      for (let p = 1; ; p += 1) {
        // eslint-disable-next-line no-await-in-loop
        const result = await listAllUsers({
          page: p,
          pageSize: EXPORT_PAGE_SIZE,
          search: debouncedSearch,
          role: roleFilter,
          status: statusFilter,
        });
        all.push(...result.items);
        if (result.items.length === 0 || p >= result.totalPages) break;
      }
      const csvRows = all.map((u) => ({
        Name: u.name,
        Email: u.email,
        Role: roleLabel(u.role),
        'Line Manager': lineManagers.find((lm) => lm.id === u.lineManagerId)?.name || '',
        Status: u.isActive ? 'Active' : 'Deactivated',
        Created: u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '',
      }));
      if (!downloadCsv('users_export.csv', csvRows)) showToast('Nothing to export', 'warning');
      else showToast(`${csvRows.length} user(s) exported`, 'success');
    } catch (err) {
      showToast(err?.message || 'Export failed', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadBackup = async (includeFiles) => {
    if (backupLockRef.current) return;
    backupLockRef.current = true;
    setIsBackingUp(true);
    showToast('Preparing your backup — this can take a minute for large systems…', 'info', 8000);
    try {
      await downloadBackup(includeFiles);
      showToast('Backup downloaded. Please store it somewhere safe and off this server.', 'success', 8000);
      getBackupStats().then(setBackupStats).catch(() => {});
    } catch (err) {
      showToast(err?.message || 'Backup failed', 'error');
    } finally {
      backupLockRef.current = false;
      setIsBackingUp(false);
    }
  };

  const handleRestore = async () => {
    if (backupLockRef.current) return;
    if (!restoreFile) return showToast('Choose a backup file first', 'warning');
    if (restoreConfirm !== 'RESTORE') return showToast('Type RESTORE to confirm', 'warning');
    backupLockRef.current = true;
    setIsRestoring(true);
    try {
      const text = await restoreFile.text();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error("That file isn't a valid Milex backup. Please choose the .json file you downloaded from this page.");
      }
      const result = await restoreBackup(parsed, restoreConfirm);
      showToast(
        `Restore complete (${result.filesRestored} file(s)). Everyone must sign in again.`,
        'success',
        10000
      );
      setIsRestorePanelOpen(false);
      setRestoreFile(null);
      setRestoreConfirm('');
      setTimeout(() => {
        window.location.href = '/login';
      }, 2500);
    } catch (err) {
      showToast(err?.message || 'Restore failed', 'error', 10000);
    } finally {
      backupLockRef.current = false;
      setIsRestoring(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[1440px] mx-auto px-3 sm:px-6 py-5 sm:py-6 space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
              <ShieldCheck size={22} className="text-slate-400" /> User &amp; Access Management
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Create users, assign organizational roles, manage reporting hierarchy and system permissions.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                maxLength={150}
                placeholder="Search users..."
                className="pl-7 pr-2 py-2.5 w-40 sm:w-52 rounded-lg border border-slate-200 text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <button
              type="button"
              onClick={exportUsers}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 border border-slate-200 bg-white px-3 py-2.5 rounded-lg hover:bg-slate-50 transition disabled:opacity-50"
            >
              {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Export Users
            </button>
            <button
              type="button"
              onClick={reloadAll}
              disabled={isTableLoading}
              aria-label="Refresh"
              className="inline-flex items-center justify-center text-slate-600 border border-slate-200 bg-white w-9 h-9 rounded-lg hover:bg-slate-50 transition disabled:opacity-50"
            >
              {isTableLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            </button>
            <button
              type="button"
              onClick={() => setIsBulkImportOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 border border-emerald-200 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-100 transition"
            >
              <FileSpreadsheet size={14} /> Import KAMs
            </button>
            <button
              type="button"
              onClick={() => setIsCreatePanelOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-emerald-800 transition"
            >
              <Plus size={14} /> Create User
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard icon={Users} label="Total Users" value={totalUsers} trend={trendFromSeries(stats?.series?.total)} series={stats?.series?.total} iconBg="bg-emerald-50 text-emerald-600" />
          <StatCard icon={Users} label="Active Users" value={activeUsers} trend={trendFromSeries(stats?.series?.active)} series={stats?.series?.active} iconBg="bg-emerald-50 text-emerald-600" />
          <StatCard icon={Users} label="Inactive Users" value={inactiveUsers} trend={trendFromSeries(stats?.series?.inactive)} series={stats?.series?.inactive} iconBg="bg-red-50 text-red-600" />
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)] min-w-0">
            <p className="text-xs font-bold text-slate-600 mb-2">Role Distribution</p>
            {roleDistribution.length === 0 ? (
              <p className="text-[11px] text-slate-400">{isLoading ? 'Loading…' : 'No users yet.'}</p>
            ) : (
              <div className="flex items-center gap-3">
                <Donut segments={roleDistribution} />
                <div className="space-y-1 min-w-0">
                  {roleDistribution.map((seg) => (
                    <div key={seg.role} className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-600">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                      <span className="truncate">{seg.label}</span>
                      <span className="text-slate-400">{seg.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8 space-y-4 min-w-0">
            {/* Filters toolbar */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-3 sm:p-4 flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 mr-1 shrink-0">Advanced Filters:</span>
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                }}
                className="border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 px-2.5 py-2 outline-none focus:border-emerald-500 bg-white"
              >
                <option value="">All Roles</option>
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 px-2.5 py-2 outline-none focus:border-emerald-500 bg-white"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Deactivated</option>
              </select>
              <div className="relative flex-1 min-w-[140px]">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  maxLength={150}
                  placeholder="Search table..."
                  className="w-full pl-7 pr-2 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Users table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              {isTableLoading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
                  <Loader2 size={16} className="animate-spin" /> Loading users...
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead className="sticky top-0 bg-slate-50 z-10">
                      <tr className="text-[10px] text-slate-400 font-bold uppercase tracking-wide border-b border-slate-200">
                        <th className="py-2.5 px-4 w-56">Name</th>
                        <th className="py-2.5 px-3">Email</th>
                        <th className="py-2.5 px-3 w-44">Role</th>
                        <th className="py-2.5 px-3 w-48">Line Manager</th>
                        <th className="py-2.5 px-3 w-32">Status</th>
                        <th className="py-2.5 px-3 w-32 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rows.map((u, idx) => (
                        <tr key={u.id} className={`align-top ${idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'} hover:bg-emerald-50/30 transition-colors`}>
                          <td className="py-2.5 px-4">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Avatar name={u.name} />
                              <div className="min-w-0">
                                <span className="font-bold text-slate-800 text-sm truncate block">{u.name}</span>
                                {u.mustChangePassword && (
                                  <span className="text-[9px] font-bold text-amber-600 uppercase">Password change pending</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 text-xs truncate max-w-[200px]">{u.email}</td>
                          <td className="py-2.5 px-3">
                            <select
                              className={`border-0 ring-1 ring-inset rounded-full text-[11px] font-bold px-2.5 py-1 outline-none focus:ring-emerald-500 cursor-pointer ${
                                ROLE_BADGE_STYLE[u.role] || 'bg-slate-100 text-slate-600 ring-slate-200'
                              }`}
                              value={u.role}
                              disabled={u.role === 'SUPER_ADMIN' || u.role === 'CUSTOMER'}
                              onChange={(e) => handleRoleChange(u, e.target.value)}
                            >
                              {/* An existing Super Admin's own role is shown but
                                  locked; no other account can be promoted to it. */}
                              {(u.role === 'SUPER_ADMIN' || u.role === 'CUSTOMER'
                                ? ROLE_OPTIONS
                                : ASSIGNABLE_ROLE_OPTIONS
                              ).map((r) => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2.5 px-3">
                            {['KAM', 'SALES_COORDINATOR'].includes(u.role) ? (
                              <select
                                className="border border-slate-200 p-1.5 rounded-lg text-xs bg-white outline-none focus:border-emerald-500 w-full"
                                value={u.lineManagerId || ''}
                                onChange={(e) => handleLineManagerChange(u, e.target.value)}
                              >
                                <option value="">Unassigned</option>
                                {lineManagers.map((lm) => (
                                  <option key={lm.id} value={lm.id}>{lm.name}</option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-slate-300 text-xs">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <button type="button" onClick={() => handleToggleActive(u)}>
                              <StatusPill isActive={u.isActive} />
                            </button>
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setPasswordTargetId(u.id)}
                              aria-label="Set password"
                              className="text-slate-300 hover:text-emerald-600 transition"
                            >
                              <KeyRound size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {rows.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-xs text-slate-400">
                            No users match your filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
              <Pagination
                page={page}
                totalPages={totalPages}
                totalItems={total}
                pageSize={PAGE_SIZE}
                onChange={setPage}
                className="px-4"
              />
            </div>
          </div>

          {/* Right utility sidebar */}
          <div className="lg:col-span-4 space-y-5 min-w-0">
            <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-4">
              <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-1.5">
                <Bell size={14} className="text-slate-400" /> New Users
              </h3>
              {recentUsers.length === 0 ? (
                <p className="text-xs text-slate-400">{isLoading ? 'Loading…' : 'No users yet.'}</p>
              ) : (
                <div className="space-y-3">
                  {recentUsers.map((u) => (
                    <div key={u.id} className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={u.name} />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-700 truncate">{u.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {roleLabel(u.role)}
                          {u.createdAt ? ` · ${new Date(u.createdAt).toLocaleDateString()}` : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-4 space-y-3">
              <h3 className="font-bold text-slate-800 text-sm">Analytics</h3>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-semibold">Active Users</span>
                <span className="font-bold text-slate-800">{activeUsers}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-semibold">Inactive Users</span>
                <span className="font-bold text-slate-800">{inactiveUsers}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-semibold">Total Users</span>
                <span className="font-bold text-slate-800">{totalUsers}</span>
              </div>
            </div>

            {/* System backup & restore */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-4 space-y-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <DatabaseBackup size={14} className="text-slate-400" /> Backup &amp; Restore
              </h3>

              {backupStats && (
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-semibold flex items-center gap-1">
                      <HardDrive size={11} /> Uploaded files
                    </span>
                    <span className="font-bold text-slate-800">
                      {backupStats.files.count} · {formatBytes(backupStats.files.totalBytes)}
                    </span>
                  </div>
                  {Object.entries(backupStats.records).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-slate-500 font-semibold capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                      <span className="font-bold text-slate-800">{value}</span>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                disabled={isBackingUp}
                onClick={() => handleDownloadBackup(true)}
                className="w-full inline-flex items-center justify-center gap-1.5 bg-emerald-700 text-white font-bold py-2.5 rounded-lg text-xs hover:bg-emerald-800 transition disabled:opacity-50"
              >
                {isBackingUp ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                Download Full Backup (with files)
              </button>
              <button
                type="button"
                disabled={isBackingUp}
                onClick={() => handleDownloadBackup(false)}
                className="w-full inline-flex items-center justify-center gap-1.5 border border-slate-200 text-slate-600 font-bold py-2 rounded-lg text-xs hover:bg-slate-50 transition disabled:opacity-50"
              >
                <Download size={13} /> Data Only (smaller)
              </button>
              <button
                type="button"
                onClick={() => setIsRestorePanelOpen(true)}
                className="w-full inline-flex items-center justify-center gap-1.5 border border-red-200 text-red-600 bg-red-50 font-bold py-2 rounded-lg text-xs hover:bg-red-100 transition"
              >
                <UploadCloud size={13} /> Restore From Backup
              </button>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Keep backups somewhere other than this server. A restore replaces everything currently stored.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Create User Slide-Over Panel */}
      {isCreatePanelOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/30" onClick={() => setIsCreatePanelOpen(false)} />
          <div className="relative w-full sm:w-[420px] h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <UserPlus size={18} className="text-emerald-600" /> Create User
              </h3>
              <button
                type="button"
                onClick={() => setIsCreatePanelOpen(false)}
                aria-label="Close"
                className="w-8 h-8 rounded-full inline-flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Full Name</label>
                <input
                  className="w-full border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  placeholder="Full name"
                  value={form.name}
                  maxLength={150}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Email</label>
                <input
                  type="email"
                  className="w-full border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  placeholder="name@company.com"
                  value={form.email}
                  maxLength={254}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Temporary Password</label>
                <div className="flex gap-2 items-start">
                  <div className="flex-1 min-w-0">
                    <PasswordField
                      placeholder="Temporary password"
                      value={form.password}
                      onChange={(v) => setForm((p) => ({ ...p, password: v }))}
                      className="bg-white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, password: generatePassword() }))}
                    className="px-3 py-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition shrink-0"
                  >
                    Generate
                  </button>
                </div>
                <ul className="mt-1.5 text-[10px] text-slate-400 space-y-0.5">
                  {PASSWORD_RULES.map((r) => (
                    <li key={r.key}>• {r.label}</li>
                  ))}
                </ul>
                <p className="text-[10px] text-slate-400 mt-1.5">
                  They'll be asked to replace this with their own password the first time they sign in.
                </p>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Role</label>
                <select
                  className="w-full border border-slate-200 p-2.5 rounded-lg text-sm bg-white outline-none focus:border-emerald-500"
                  value={form.role}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      role: e.target.value,
                      // When exactly one Line Manager exists, preselect them —
                      // there is nothing to choose between.
                      lineManagerId:
                        ['KAM', 'SALES_COORDINATOR'].includes(e.target.value) && lineManagers.length === 1
                          ? lineManagers[0].id
                          : '',
                    }))
                  }
                >
                  {ASSIGNABLE_ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              {['KAM', 'SALES_COORDINATOR'].includes(form.role) && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Line Manager</label>
                  {lineManagers.length === 1 ? (
                    <>
                      <div className="w-full border border-slate-200 bg-slate-50 p-2.5 rounded-lg text-sm text-slate-700 font-medium">
                        {lineManagers[0].name}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Assigned automatically — there is only one Line Manager in the system.
                      </p>
                    </>
                  ) : (
                    <select
                      className="w-full border border-slate-200 p-2.5 rounded-lg text-sm bg-white outline-none focus:border-emerald-500"
                      value={form.lineManagerId}
                      onChange={(e) => setForm((p) => ({ ...p, lineManagerId: e.target.value }))}
                    >
                      <option value="">No Line Manager (assign later)</option>
                      {lineManagers.map((lm) => (
                        <option key={lm.id} value={lm.id}>{lm.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>
            <div className="px-5 py-4 border-t border-slate-100 shrink-0">
              <button
                type="button"
                disabled={isCreating}
                onClick={handleCreate}
                className="w-full inline-flex items-center justify-center gap-2 bg-emerald-700 text-white font-bold py-2.5 rounded-lg text-sm shadow-sm hover:bg-emerald-800 transition disabled:opacity-50"
              >
                {isCreating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Create User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {passwordTargetId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <KeyRound size={16} className="text-emerald-600" /> Set New Password
              </h3>
              <button
                type="button"
                onClick={() => { setPasswordTargetId(null); setNewPassword(''); }}
                aria-label="Close"
                className="w-7 h-7 rounded-full inline-flex items-center justify-center text-slate-400 hover:bg-slate-100 transition"
              >
                <X size={14} />
              </button>
            </div>
            <div className="flex gap-2 items-start">
              <div className="flex-1 min-w-0">
                <PasswordField
                  placeholder="New password"
                  value={newPassword}
                  onChange={setNewPassword}
                  showChecklist
                  className="bg-white"
                />
              </div>
              <button
                type="button"
                onClick={() => setNewPassword(generatePassword())}
                className="px-3 py-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition shrink-0"
              >
                Generate
              </button>
              {newPassword && (
                <button
                  type="button"
                  onClick={() => { navigator.clipboard?.writeText(newPassword); showToast('Password copied', 'success'); }}
                  aria-label="Copy password"
                  className="w-10 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition shrink-0 inline-flex items-center justify-center"
                >
                  <Copy size={14} />
                </button>
              )}
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={requireChangeOnLogin}
                onChange={(e) => setRequireChangeOnLogin(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-xs font-semibold text-slate-600">Require password change on next login</span>
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={isSavingPassword}
                onClick={handleSavePassword}
                className="flex-1 bg-emerald-700 text-white font-bold py-2.5 rounded-lg text-sm disabled:opacity-50"
              >
                {isSavingPassword ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Save Password'}
              </button>
              <button
                type="button"
                onClick={() => { setPasswordTargetId(null); setNewPassword(''); }}
                className="px-4 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isBulkImportOpen && (
        <BulkImportKamModal
          lineManagers={lineManagers}
          onClose={() => setIsBulkImportOpen(false)}
          onImported={reloadAll}
        />
      )}

      {/* Restore Modal */}
      {isRestorePanelOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <UploadCloud size={16} className="text-red-600" /> Restore From Backup
              </h3>
              <button
                type="button"
                onClick={() => setIsRestorePanelOpen(false)}
                aria-label="Close"
                className="w-7 h-7 rounded-full inline-flex items-center justify-center text-slate-400 hover:bg-slate-100 transition"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertTriangle size={16} className="text-red-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-red-700 leading-relaxed">
                This replaces every customer, user, report and document currently in the system with the contents of
                the backup file. Anything created since that backup was taken will be lost, and everyone will be
                signed out.
              </p>
            </div>

            <label className="block border-2 border-dashed border-slate-200 rounded-lg py-4 text-center cursor-pointer hover:bg-slate-50 transition text-xs font-semibold text-slate-600">
              {restoreFile ? restoreFile.name : 'Choose a backup .json file'}
              <input
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
              />
            </label>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Type RESTORE to confirm
              </label>
              <input
                className="w-full border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:border-red-500"
                value={restoreConfirm}
                maxLength={20}
                placeholder="RESTORE"
                onChange={(e) => setRestoreConfirm(e.target.value.toUpperCase())}
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={isRestoring || restoreConfirm !== 'RESTORE' || !restoreFile}
                onClick={handleRestore}
                className="flex-1 bg-red-600 text-white font-bold py-2.5 rounded-lg text-sm disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {isRestoring ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
                Restore Now
              </button>
              <button
                type="button"
                onClick={() => setIsRestorePanelOpen(false)}
                className="px-4 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOverview;