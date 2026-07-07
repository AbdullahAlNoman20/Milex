// src/Pages/Login/Login.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../Components/hooks/useAuth';
import { useToast } from '../../Components/hooks/useToast';
import Loader from '../../Components/Shared/Loader';

const USERS_ENDPOINT = '/data/users.json';
const REQUEST_TIMEOUT_MS = 10000;

const Login = () => {
  const { login, isAuthenticated, isInitializing } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [users, setUsers] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState('');
  const [isFetching, setIsFetching] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    if (!isInitializing && isAuthenticated) {
      const redirectTo = location.state?.from?.pathname || '/app';
      navigate(redirectTo, { replace: true });
    }
  }, [isInitializing, isAuthenticated, navigate, location]);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    (async () => {
      try {
        setIsFetching(true);
        setFetchError(null);
        const res = await fetch(USERS_ENDPOINT, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) throw new Error(`Failed to load users: ${res.status}`);
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error('Invalid users payload');
        if (isMounted) setUsers(data);
      } catch (err) {
        if (isMounted) setFetchError('Unable to load login roles. Please refresh.');
      } finally {
        clearTimeout(timeoutId);
        if (isMounted) setIsFetching(false);
      }
    })();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      if (!selectedEmail) {
        showToast('Please select a login role', 'warning');
        return;
      }
      const user = users.find((u) => u.email === selectedEmail);
      if (!user) {
        showToast('Invalid selection', 'error');
        return;
      }
      const { password, ...safeUser } = user;
      const ok = login(safeUser);
      if (!ok) {
        showToast('Login failed', 'error');
        return;
      }
      const redirectTo = location.state?.from?.pathname || '/app';
      navigate(redirectTo, { replace: true });
    },
    [selectedEmail, users, login, showToast, navigate, location]
  );

  if (isInitializing || isFetching) {
    return <Loader fullScreen label="Loading login options..." />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-md border border-slate-200">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight italic uppercase">MILEX</h1>
          <p className="text-emerald-600 text-xs font-bold tracking-widest mt-1">WITH YOU EVERY MILE</p>
        </div>

        {fetchError && (
          <p role="alert" className="text-xs text-red-600 font-semibold mb-4 text-center">
            {fetchError}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="login-role" className="block text-sm font-semibold text-slate-700 mb-2">
              System Login Role
            </label>
            <select
              id="login-role"
              className="w-full border border-slate-300 p-3 rounded-lg focus:border-emerald-500 outline-none bg-slate-50"
              value={selectedEmail}
              onChange={(e) => setSelectedEmail(e.target.value)}
              required
              disabled={users.length === 0}
            >
              <option value="">Choose role...</option>
              {users.map((u) => (
                <option key={u.email} value={u.email}>
                  {u.name} — {u.role}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={users.length === 0}
            className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-lg hover:bg-emerald-700 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;