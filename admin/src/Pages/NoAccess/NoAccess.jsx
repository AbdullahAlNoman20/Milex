// admin/src/Pages/NoAccess/NoAccess.jsx
import { useAuth } from '../../Components/hooks/useAuth';
import { Clock } from 'lucide-react';

// Shown to a signed-in customer. Their account is real and their password
// works — there simply is no customer area yet, and saying that plainly is
// better than an access-denied page that reads like something went wrong.
const NoAccess = () => {
  const { currentUser, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 bg-slate-100">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-8 max-w-md w-full">
        <img src="/log.jpeg" alt="MILEX" className="h-14 w-auto object-contain mx-auto mb-4" />
        <Clock size={32} className="text-emerald-600 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-slate-800 mb-2">Your account is ready</h2>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          Hello {currentUser?.name}. Your customer account is active, but the customer portal
          isn't open yet. Your Key Account Manager will continue to look after everything in the
          meantime.
        </p>
        <button
          type="button"
          onClick={async () => {
            await logout();
            window.location.href = '/login';
          }}
          className="text-emerald-600 font-semibold text-sm hover:underline"
        >
          Sign out
        </button>
      </div>
    </div>
  );
};

export default NoAccess;