// admin/src/Pages/modules/sales/pages/CustomerAccountsPage.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { Users, Search, Mail, KeyRound, Loader2, X, Copy, Check, RefreshCw } from 'lucide-react';
import { listCustomerAccounts, setCustomerAccountEmail } from '../services/customerAccountService';
import { setUserPasswordAdmin } from '../services/userAdminService';
import { useToast } from '../../../../Components/hooks/useToast';
import { useConfirm } from '../../../../Components/hooks/useConfirm';
import { isValidEmail } from '../../../../Components/utils/validators';
import PasswordField from '../../../../Components/Shared/PasswordField';
import Pagination from '../../../../Components/Shared/Pagination';

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 350;

// Same generator the user console uses: a temporary password nobody can guess
// from the date the account was made.
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
  while (chars.length < PASSWORD_LENGTH) chars.push(PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)]);
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
};

// A login the system generated from the account id, rather than a real
// address the customer gave. Worth marking, because it is the one thing on
// this page that still needs doing.
const isGeneratedLogin = (email) => typeof email === 'string' && email.endsWith('@customer.milex');

const CustomerAccountsPage = () => {
  const { showToast } = useToast();
  const confirm = useConfirm();

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);
  const requestIdRef = useRef(0);

  const [emailTarget, setEmailTarget] = useState(null);
  const [emailValue, setEmailValue] = useState('');
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const emailLockRef = useRef(false);

  const [passwordTarget, setPasswordTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [requireChange, setRequireChange] = useState(true);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const passwordLockRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), search ? SEARCH_DEBOUNCE_MS : 0);
    return () => clearTimeout(timer);
  }, [search]);

  const changeSearch = (value) => {
    setSearch(value);
    setPage(1);
  };

  useEffect(() => {
    let cancelled = false;
    const requestId = ++requestIdRef.current;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    listCustomerAccounts({ page, pageSize: PAGE_SIZE, search: debouncedSearch })
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
        showToast(err?.message || 'Failed to load customer accounts', 'error');
      })
      .finally(() => {
        if (!cancelled && requestId === requestIdRef.current) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, debouncedSearch, reloadToken, showToast]);

  const reload = useCallback(() => setReloadToken((t) => t + 1), []);

  const openEmail = (row) => {
    setEmailTarget(row);
    setEmailValue(isGeneratedLogin(row.email) ? '' : row.email);
  };

  const saveEmail = async () => {
    if (emailLockRef.current) return;
    if (!isValidEmail(emailValue)) return showToast('Enter a valid email address', 'warning');
    const ok = await confirm({
      title: 'Change this login address?',
      message: `${emailTarget.name} will sign in with ${emailValue.trim().toLowerCase()} from now on. Their old address stops working immediately.`,
      confirmLabel: 'Change address',
    });
    if (!ok) return;
    emailLockRef.current = true;
    setIsSavingEmail(true);
    try {
      await setCustomerAccountEmail(emailTarget.id, emailValue.trim());
      showToast('Login address updated', 'success');
      setEmailTarget(null);
      setEmailValue('');
      reload();
    } catch (err) {
      showToast(err?.message || 'Could not change the address', 'error');
    } finally {
      emailLockRef.current = false;
      setIsSavingEmail(false);
    }
  };

  const savePassword = async () => {
    if (passwordLockRef.current) return;
    if (!newPassword.trim()) return showToast('Enter a new password', 'warning');
    passwordLockRef.current = true;
    setIsSavingPassword(true);
    try {
      await setUserPasswordAdmin(passwordTarget.id, newPassword, requireChange);
      showToast('Password updated — pass it on to the customer', 'success', 7000);
      setPasswordTarget(null);
      setNewPassword('');
      setRequireChange(true);
      reload();
    } catch (err) {
      showToast(err?.message || 'Could not set the password', 'error');
    } finally {
      passwordLockRef.current = false;
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-[1440px] mx-auto px-3 sm:px-6 py-5 sm:py-6 space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Users size={22} className="text-slate-400" /> Customer Accounts
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Every customer that has gone live has a login, created from their account id. Set a real email address
              here, or reset the password, and pass it on to them.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => changeSearch(e.target.value)}
                maxLength={150}
                placeholder="Search name or address..."
                className="pl-7 pr-2 py-2.5 w-44 sm:w-60 rounded-lg border border-slate-200 text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <button
              type="button"
              onClick={reload}
              disabled={isLoading}
              aria-label="Refresh"
              className="inline-flex items-center justify-center text-slate-600 border border-slate-200 bg-white w-9 h-9 rounded-lg hover:bg-slate-50 transition disabled:opacity-50"
            >
              {isLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
              <Loader2 size={16} className="animate-spin" /> Loading customer accounts...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[820px]">
                <thead className="sticky top-0 bg-slate-50 z-10">
                  <tr className="text-[10px] text-slate-400 font-bold uppercase tracking-wide border-b border-slate-200">
                    <th className="py-2.5 px-4">Customer</th>
                    <th className="py-2.5 px-3 w-40">Account ID</th>
                    <th className="py-2.5 px-3">Login Address</th>
                    <th className="py-2.5 px-3 w-40">Last Signed In</th>
                    <th className="py-2.5 px-3 w-32 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-xs text-slate-400">
                        {debouncedSearch.trim()
                          ? 'No customer account matches your search.'
                          : 'No customer has gone live yet, so there are no logins to manage.'}
                      </td>
                    </tr>
                  ) : (
                    rows.map((u, idx) => (
                      <tr
                        key={u.id}
                        className={`align-top ${idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'} hover:bg-emerald-50/30 transition-colors`}
                      >
                        <td className="py-2.5 px-4">
                          <p className="font-bold text-slate-800 text-sm break-words">{u.name}</p>
                          {u.customer?.accountName && u.customer.accountName !== u.name && (
                            <p className="text-[10px] text-slate-400 break-words">{u.customer.accountName}</p>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-xs text-slate-600">
                          {u.customer?.barcode || '—'}
                        </td>
                        <td className="py-2.5 px-3">
                          {isGeneratedLogin(u.email) ? (
                            <>
                              <span className="font-mono text-xs text-slate-500 break-all">{u.email}</span>
                              <span className="block mt-1 text-[9px] font-bold uppercase text-amber-600">
                                System-generated — no real address yet
                              </span>
                            </>
                          ) : (
                            <span className="text-xs text-slate-700 break-all">{u.email}</span>
                          )}
                          {u.mustChangePassword && (
                            <span className="block mt-1 text-[9px] font-bold uppercase text-amber-600">
                              Password change pending
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-xs text-slate-400 whitespace-nowrap">
                          {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => openEmail(u)}
                            aria-label={`Change login address for ${u.name}`}
                            title="Change login address"
                            className="text-slate-300 hover:text-emerald-600 transition mr-3"
                          >
                            <Mail size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPasswordTarget(u)}
                            aria-label={`Set password for ${u.name}`}
                            title="Set password"
                            className="text-slate-300 hover:text-emerald-600 transition"
                          >
                            <KeyRound size={15} />
                          </button>
                        </td>
                      </tr>
                    ))
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

      {emailTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Mail size={16} className="text-emerald-600" /> Login Address
              </h3>
              <button
                type="button"
                onClick={() => setEmailTarget(null)}
                aria-label="Close"
                className="w-7 h-7 rounded-full inline-flex items-center justify-center text-slate-400 hover:bg-slate-100 transition"
              >
                <X size={14} />
              </button>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              {emailTarget.name} currently signs in with{' '}
              <span className="font-mono text-slate-700 break-all">{emailTarget.email}</span>.
            </p>
            <input
              type="email"
              autoComplete="off"
              maxLength={254}
              placeholder="name@company.com"
              value={emailValue}
              onChange={(e) => setEmailValue(e.target.value)}
              className="w-full border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={isSavingEmail}
                onClick={saveEmail}
                className="flex-1 bg-emerald-700 text-white font-bold py-2.5 rounded-lg text-sm disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {isSavingEmail ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save Address
              </button>
              <button
                type="button"
                onClick={() => setEmailTarget(null)}
                className="px-4 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {passwordTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <KeyRound size={16} className="text-emerald-600" /> Set Password
              </h3>
              <button
                type="button"
                onClick={() => {
                  setPasswordTarget(null);
                  setNewPassword('');
                }}
                aria-label="Close"
                className="w-7 h-7 rounded-full inline-flex items-center justify-center text-slate-400 hover:bg-slate-100 transition"
              >
                <X size={14} />
              </button>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              For {passwordTarget.name}. Copy it before you close this — it cannot be read back afterwards.
            </p>
            <div className="flex gap-2 items-start">
              <div className="flex-1 min-w-0">
                <PasswordField placeholder="New password" value={newPassword} onChange={setNewPassword} showChecklist />
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
                  onClick={() => {
                    navigator.clipboard?.writeText(newPassword);
                    showToast('Password copied', 'success');
                  }}
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
                checked={requireChange}
                onChange={(e) => setRequireChange(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-xs font-semibold text-slate-600">Require password change on next login</span>
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={isSavingPassword}
                onClick={savePassword}
                className="flex-1 bg-emerald-700 text-white font-bold py-2.5 rounded-lg text-sm disabled:opacity-50"
              >
                {isSavingPassword ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Save Password'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPasswordTarget(null);
                  setNewPassword('');
                }}
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

export default CustomerAccountsPage;