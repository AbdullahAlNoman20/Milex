// src/Pages/Login/Login.jsx — REPLACE ENTIRE FILE
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../Components/hooks/useAuth';
import { useToast } from '../../Components/hooks/useToast';
import { isValidEmail, isRequired } from '../../Components/utils/validators';
import Loader from '../../Components/Shared/Loader';
import Toast from '../../Components/Shared/Toast';

const MAX_ATTEMPTS_MSG_LENGTH = 200;

const DEMO_CREDENTIALS = Object.freeze([
  { label: 'Sales Coordinator', email: 'sc@milex.local' },
  { label: 'Kam', email: 'kam@milex.local' },
  { label: 'Admin', email: 'admin@milex.local' },
  { label: 'Line Manager', email: 'lm@milex.local' },
]);
const DEMO_PASSWORD = 'Test@Pass123!';

const Login = () => {
  const { login, isAuthenticated, isInitializing } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isInitializing && isAuthenticated) {
      const redirectTo = location.state?.from?.pathname || '/app';
      navigate(redirectTo, { replace: true });
    }
  }, [isInitializing, isAuthenticated, navigate, location]);

  const doLogin = useCallback(
    async (loginEmail, loginPassword) => {
      if (!isValidEmail(loginEmail)) return showToast('Enter a valid email address', 'warning');
      if (!isRequired(loginPassword)) return showToast('Password is required', 'warning');

      setIsSubmitting(true);
      const result = await login(loginEmail, loginPassword);
      setIsSubmitting(false);

      if (!result.ok) {
        showToast(result.error?.slice(0, MAX_ATTEMPTS_MSG_LENGTH) || 'Login failed', 'error');
        return;
      }

      const redirectTo = location.state?.from?.pathname || '/app';
      navigate(redirectTo, { replace: true });
    },
    [login, showToast, navigate, location]
  );

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      doLogin(email, password);
    },
    [email, password, doLogin]
  );

  const handleDemoSelect = useCallback(
    (e) => {
      const selectedEmail = e.target.value;
      if (!selectedEmail) return;
      const match = DEMO_CREDENTIALS.find((c) => c.email === selectedEmail);
      if (!match) return;
      setEmail(match.email);
      setPassword(DEMO_PASSWORD);
      doLogin(match.email, DEMO_PASSWORD);
    },
    [doLogin]
  );

  if (isInitializing) {
    return <Loader fullScreen label="Checking session..." />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <Toast />
      <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-md border border-slate-200">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight italic uppercase">MILEX</h1>
          <p className="text-emerald-600 text-xs font-bold tracking-widest mt-1">WITH YOU EVERY MILE</p>
        </div>

         <div className="mb-5">
          <label htmlFor="demo-credential" className="block text-sm font-semibold text-slate-700 mb-2">
            Quick Login (Demo)
          </label>
          <select
            id="demo-credential"
            className="w-full border border-slate-300 p-3 rounded-lg focus:border-emerald-500 outline-none bg-slate-50"
            defaultValue=""
            disabled={isSubmitting}
            onChange={handleDemoSelect}
          >
            <option value="" disabled>
              Select a role...
            </option>
            {DEMO_CREDENTIALS.map((c) => (
              <option key={c.email} value={c.email}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
          <div>
            <label htmlFor="login-email" className="block text-sm font-semibold text-slate-700 mb-2">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              maxLength={254}
              className="w-full border border-slate-300 p-3 rounded-lg focus:border-emerald-500 outline-none bg-slate-50"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="login-password" className="block text-sm font-semibold text-slate-700 mb-2">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              maxLength={200}
              className="w-full border border-slate-300 p-3 rounded-lg focus:border-emerald-500 outline-none bg-slate-50"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-lg hover:bg-emerald-700 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Signing in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;