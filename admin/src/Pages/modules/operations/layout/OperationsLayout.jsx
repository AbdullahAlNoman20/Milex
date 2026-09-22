// src/Pages/modules/operations/layout/OperationsLayout.jsx
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import Toast from '../../../../Components/Shared/Toast';
import ErrorBoundary from '../../../../Components/Shared/ErrorBoundary';
import { useOperationsAuth } from '../hooks/useOperationsAuth';
import OperationsSidebar from './OperationsSidebar';
import NotificationBell from '../components/NotificationBell';
import OperationsProfileModal from '../components/OperationsProfileModal';

const OperationsLayoutInner = () => {
  const { currentUser, logout } = useOperationsAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    window.location.href = '/operations/login';
  };

  return (
    <div className="flex h-screen bg-[#F4F6F8] font-sans text-slate-800">
      <OperationsSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
          <div>
            <p className="text-xs font-bold text-slate-800 uppercase tracking-wide">Operations Module</p>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <button
              type="button"
              onClick={() => setIsProfileOpen(true)}
              aria-label="My Profile"
              className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 hover:ring-2 hover:ring-emerald-300 transition"
            >
              <span className="text-xs font-black">{currentUser?.name?.charAt(0) || '?'}</span>
            </button>
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-800">{currentUser?.name}</p>
              <p className="text-[10px] text-slate-400">{currentUser?.email}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Logout"
              className="w-9 h-9 rounded-full bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100 transition"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>
        {isProfileOpen && <OperationsProfileModal onClose={() => setIsProfileOpen(false)} />}
        <main className="flex-1 overflow-x-hidden overflow-y-auto md:p-6 relative">
          <Toast />
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};

const OperationsLayout = () => <OperationsLayoutInner />;

export default OperationsLayout;