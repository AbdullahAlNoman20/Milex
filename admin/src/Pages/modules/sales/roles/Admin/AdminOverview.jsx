// admin/src/Pages/modules/sales/roles/Admin/AdminOverview.jsx — REPLACE ENTIRE FILE
import { useEffect, useState, useCallback, useMemo } from 'react';
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
  ChevronLeft,
  ChevronRight,
  Bell,
  UserPlus,
} from 'lucide-react';
import { useSales } from '../../hooks/useSales';
import { useToast } from '../../../../../Components/hooks/useToast';
import {
  listAllUsers,
  listLineManagers,
  createUserAdmin,
  updateUserAdmin,
  setUserPasswordAdmin,
} from '../../services/userAdminService';

const ROLE_OPTIONS = [
  { value: 'KAM', label: 'KAM' },
  { value: 'SALES_COORDINATOR', label: 'Sales Coordinator' },
  { value: 'LINE_MANAGER', label: 'Line Manager' },
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
];

const ROLE_BADGE_STYLE = {
  SUPER_ADMIN: 'bg-violet-100 text-violet-700 ring-violet-200',
  LINE_MANAGER: 'bg-blue-100 text-blue-700 ring-blue-200',
  SALES_COORDINATOR: 'bg-amber-100 text-amber-700 ring-amber-200',
  KAM: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
};

const ROLE_DONUT_COLOR = {
  SUPER_ADMIN: '#7C3AED',
  LINE_MANAGER: '#2563EB',
  SALES_COORDINATOR: '#F59E0B',
  KAM: '#059669',
};

const roleLabel = (value) => ROLE_OPTIONS.find((r) => r.value === value)?.label || value;

const emptyForm = { name: '', email: '', password: '', role: 'KAM', lineManagerId: '', sendWelcomeEmail: true };

const PAGE_SIZE = 10;

const generatePassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  let out = '';
  for (let i = 0; i < 12; i += 1) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
};

const StatCard = ({ icon: Icon, label, value, trend, trendUp, iconBg }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)] min-w-0">
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
          <Icon size={15} />
        </div>
        <p className="text-xs font-bold text-slate-600 truncate">{label}</p>
      </div>
      {trend != null && (
        <span
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
            trendUp ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
          }`}
        >
          {trendUp ? '▲' : '▼'} {trend}%
        </span>
      )}
    </div>
    <p className="text-2xl font-bold text-slate-800 mt-2">{value}</p>
    <svg viewBox="0 0 100 24" className="w-full h-6 mt-2" preserveAspectRatio="none">
      <polyline
        points="0,18 15,14 30,16 45,8 60,12 75,4 90,7 100,2"
        fill="none"
        stroke={trendUp === false ? '#EF4444' : '#059669'}
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
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
    <div
      className="rounded-full shrink-0"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(${stops})`,
      }}
    >
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
  useSales();
  const { showToast } = useToast();
  const [users, setUsers] = useState([]);
  const [lineManagers, setLineManagers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [isCreating, setIsCreating] = useState(false);
  const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(false);
  const [passwordTargetId, setPasswordTargetId] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [requireChangeOnLogin, setRequireChangeOnLogin] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [userRes, lms] = await Promise.all([listAllUsers(1, 200), listLineManagers()]);
      setUsers(userRes.items);
      setLineManagers(lms);
    } catch (err) {
      showToast(err?.message || 'Failed to load users', 'error');
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll();
  }, [loadAll]);

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.isActive).length;
  const inactiveUsers = users.filter((u) => !u.isActive).length;

  const roleDistribution = useMemo(() => {
    const counts = {};
    users.forEach((u) => {
      counts[u.role] = (counts[u.role] || 0) + 1;
    });
    return ROLE_OPTIONS.map((r) => ({
      role: r.value,
      label: r.label,
      value: counts[r.value] || 0,
      color: ROLE_DONUT_COLOR[r.value],
    })).filter((seg) => seg.value > 0);
  }, [users]);

  const recentUsers = useMemo(() => users.slice(-5).reverse(), [users]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      const matchesSearch = !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
      const matchesRole = !roleFilter || u.role === roleFilter;
      const matchesStatus =
        !statusFilter || (statusFilter === 'active' ? u.isActive : !u.isActive);
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const pageClamped = Math.min(page, totalPages);
  const pagedUsers = filteredUsers.slice((pageClamped - 1) * PAGE_SIZE, pageClamped * PAGE_SIZE);

  const handleCreate = async () => {
    if (isCreating) return;
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      return showToast('Name, email and password are required', 'warning');
    }
    setIsCreating(true);
    try {
      await createUserAdmin({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        lineManagerId: ['KAM', 'SALES_COORDINATOR'].includes(form.role) && form.lineManagerId ? form.lineManagerId : null,
      });
      showToast('User created', 'success');
      setForm(emptyForm);
      setIsCreatePanelOpen(false);
      setPage(1);
      loadAll();
    } catch (err) {
      showToast(err?.message || 'Failed to create user', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRoleChange = async (user, role) => {
    try {
      await updateUserAdmin(user.id, { role });
      showToast('Role updated', 'success');
      loadAll();
    } catch (err) {
      showToast(err?.message || 'Failed to update role', 'error');
    }
  };

  const handleLineManagerChange = async (user, lineManagerId) => {
    try {
      await updateUserAdmin(user.id, { lineManagerId: lineManagerId || null });
      showToast('Line Manager assignment updated', 'success');
      loadAll();
    } catch (err) {
      showToast(err?.message || 'Failed to update assignment', 'error');
    }
  };

  const handleToggleActive = async (user) => {
    if (!window.confirm(`${user.isActive ? 'Deactivate' : 'Reactivate'} ${user.name}?`)) return;
    try {
      await updateUserAdmin(user.id, { isActive: !user.isActive });
      showToast(user.isActive ? 'User deactivated' : 'User reactivated', 'success');
      loadAll();
    } catch (err) {
      showToast(err?.message || 'Failed to update user', 'error');
    }
  };

  const handleSavePassword = async () => {
    if (!newPassword.trim()) return showToast('Enter a new password', 'warning');
    setIsSavingPassword(true);
    try {
      await setUserPasswordAdmin(passwordTargetId, newPassword);
      showToast('Password updated', 'success');
      setPasswordTargetId(null);
      setNewPassword('');
      setRequireChangeOnLogin(true);
    } catch (err) {
      showToast(err?.message || 'Failed to set password', 'error');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const exportUsers = () => {
    const rows = [
      ['Name', 'Email', 'Role', 'Line Manager', 'Status'],
      ...filteredUsers.map((u) => [
        u.name,
        u.email,
        roleLabel(u.role),
        lineManagers.find((lm) => lm.id === u.lineManagerId)?.name || '',
        u.isActive ? 'Active' : 'Deactivated',
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users_export.csv';
    a.click();
    URL.revokeObjectURL(url);
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
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                maxLength={150}
                placeholder="Search users..."
                className="pl-7 pr-2 py-2.5 w-40 sm:w-52 rounded-lg border border-slate-200 text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <button
              type="button"
              onClick={exportUsers}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 border border-slate-200 bg-white px-3 py-2.5 rounded-lg hover:bg-slate-50 transition"
            >
              <Download size={14} /> Export Users
            </button>
            <button
              type="button"
              onClick={loadAll}
              disabled={isLoading}
              aria-label="Refresh"
              className="inline-flex items-center justify-center text-slate-600 border border-slate-200 bg-white w-9 h-9 rounded-lg hover:bg-slate-50 transition disabled:opacity-50"
            >
              {isLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
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
          <StatCard icon={Users} label="Total Users" value={totalUsers} trend="18" trendUp iconBg="bg-emerald-50 text-emerald-600" />
          <StatCard icon={Users} label="Active Users" value={activeUsers} trend="3.8" trendUp iconBg="bg-emerald-50 text-emerald-600" />
          <StatCard icon={Users} label="Inactive Users" value={inactiveUsers} trend="1.3" trendUp={false} iconBg="bg-red-50 text-red-600" />
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)] min-w-0">
            <p className="text-xs font-bold text-slate-600 mb-2">Role Distribution</p>
            {roleDistribution.length === 0 ? (
              <p className="text-[11px] text-slate-400">No users yet.</p>
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
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  maxLength={150}
                  placeholder="Search table..."
                  className="w-full pl-7 pr-2 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Users table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              {isLoading ? (
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
                      {pagedUsers.map((u, idx) => (
                        <tr key={u.id} className={`align-top ${idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'} hover:bg-emerald-50/30 transition-colors`}>
                          <td className="py-2.5 px-4">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Avatar name={u.name} />
                              <span className="font-bold text-slate-800 text-sm truncate">{u.name}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 text-xs truncate max-w-[200px]">{u.email}</td>
                          <td className="py-2.5 px-3">
                            <select
                              className={`border-0 ring-1 ring-inset rounded-full text-[11px] font-bold px-2.5 py-1 outline-none focus:ring-emerald-500 cursor-pointer ${
                                ROLE_BADGE_STYLE[u.role] || 'bg-slate-100 text-slate-600 ring-slate-200'
                              }`}
                              value={u.role}
                              onChange={(e) => handleRoleChange(u, e.target.value)}
                            >
                              {ROLE_OPTIONS.map((r) => (
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
                      {pagedUsers.length === 0 && (
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
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                <span className="text-[10px] text-slate-400">
                  Page {pageClamped} of {totalPages} · {filteredUsers.length} user(s)
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={pageClamped <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="w-7 h-7 rounded-full border border-slate-200 text-slate-500 inline-flex items-center justify-center disabled:opacity-40 hover:bg-slate-50 transition"
                  >
                    <ChevronLeft size={13} />
                  </button>
                  <button
                    type="button"
                    disabled={pageClamped >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="w-7 h-7 rounded-full border border-slate-200 text-slate-500 inline-flex items-center justify-center disabled:opacity-40 hover:bg-slate-50 transition"
                  >
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right utility sidebar */}
          <div className="lg:col-span-4 space-y-5 min-w-0">
            <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-4">
              <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-1.5">
                <Bell size={14} className="text-slate-400" /> New Users
              </h3>
              {recentUsers.length === 0 ? (
                <p className="text-xs text-slate-400">No users yet.</p>
              ) : (
                <div className="space-y-3">
                  {recentUsers.map((u) => (
                    <div key={u.id} className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={u.name} />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-700 truncate">{u.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{roleLabel(u.role)}</p>
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
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    placeholder="Temporary password"
                    value={form.password}
                    maxLength={200}
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  />
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, password: generatePassword() }))}
                    className="px-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition shrink-0"
                  >
                    Generate
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Role</label>
                <select
                  className="w-full border border-slate-200 p-2.5 rounded-lg text-sm bg-white outline-none focus:border-emerald-500"
                  value={form.role}
                  onChange={(e) => setForm((p) => ({ ...p, role: e.target.value, lineManagerId: '' }))}
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              {['KAM', 'SALES_COORDINATOR'].includes(form.role) && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Line Manager</label>
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
                </div>
              )}
              <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.sendWelcomeEmail}
                  onChange={(e) => setForm((p) => ({ ...p, sendWelcomeEmail: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs font-semibold text-slate-600">Send welcome email</span>
              </label>
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
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                placeholder="New password"
                value={newPassword}
                maxLength={200}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setNewPassword(generatePassword())}
                className="px-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition shrink-0"
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
    </div>
  );
};

export default AdminOverview;