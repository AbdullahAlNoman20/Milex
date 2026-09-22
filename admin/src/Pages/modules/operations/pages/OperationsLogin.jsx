// src/Pages/modules/operations/pages/OperationsLogin.jsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOperationsAuth } from '../hooks/useOperationsAuth';
import { useToast } from '../../../../Components/hooks/useToast';
import { isValidEmail, isRequired } from '../../../../Components/utils/validators';
import Loader from '../../../../Components/Shared/Loader';
import Toast from '../../../../Components/Shared/Toast';

const MAX_ATTEMPTS_MSG_LENGTH = 200;

const DEMO_CREDENTIALS = Object.freeze([
  { label: 'Client', email: 'client@milex.local' },
  { label: 'Operations Head', email: 'opshead@milex.local' },
  { label: 'Domestic Administrator', email: 'domestic@milex.local' },
  { label: 'Foreign Administrator', email: 'foreign@milex.local' },
]);
const DEMO_PASSWORD = 'Test@Pass123!';

const OperationsLogin = () => {
  const { login, isAuthenticated, isInitializing } = useOperationsAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isInitializing && isAuthenticated) {
      navigate('/operations', { replace: true });
    }
  }, [isInitializing, isAuthenticated, navigate]);

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
      navigate('/operations', { replace: true });
    },
    [login, showToast, navigate]
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
          <p className="text-emerald-600 text-xs font-bold tracking-widest mt-1">OPERATIONS MODULE</p>
        </div>

        <div className="mb-5">
          <label htmlFor="ops-demo-credential" className="block text-sm font-semibold text-slate-700 mb-2">
            Quick Login (Demo)
          </label>
          <select
            id="ops-demo-credential"
            className="w-full border border-slate-300 p-3 rounded-lg focus:border-emerald-500 outline-none bg-slate-50"
            defaultValue=""
            disabled={isSubmitting}
            onChange={handleDemoSelect}
          >
            <option value="" disabled>Select a role...</option>
            {DEMO_CREDENTIALS.map((c) => (
              <option key={c.email} value={c.email}>{c.label}</option>
            ))}
          </select>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
          <div>
            <label htmlFor="ops-login-email" className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
            <input
              id="ops-login-email"
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
            <label htmlFor="ops-login-password" className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
            <input
              id="ops-login-password"
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

export default OperationsLogin;