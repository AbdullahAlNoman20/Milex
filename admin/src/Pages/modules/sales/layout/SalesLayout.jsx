// src/Pages/modules/sales/layout/SalesLayout.jsx
import { Outlet } from 'react-router-dom';
import { SalesProvider } from '../context/SalesContext';
import { NotificationProvider } from '../../../../Components/context/NotificationContext';
import SalesSidebar from './SalesSidebar';
import React,{ useEffect, useState } from 'react';
import Toast from '../../../../Components/Shared/Toast';
import { useToast } from '../../../../Components/hooks/useToast';
import { getSocket } from '../../../../Components/services/socketService';
import ErrorBoundary from '../../../../Components/Shared/ErrorBoundary';
import BarcodeSearchBar from '../components/BarcodeSearchBar';
import PrintTemplate from '../components/PrintTemplate';
import { useAuth } from '../../../../Components/hooks/useAuth';
import { useSales } from '../hooks/useSales';
import { useNotifications } from '../../../../Components/hooks/useNotifications';
import NotificationBell from '../../../../Components/Shared/NotificationBell';
import ChangePasswordModal from '../../../../Components/Shared/ChangePasswordModal';
import { LogOut, KeyRound } from 'lucide-react';

const SalesLayoutInner = () => {
  const { currentUser, logout } = useAuth();
  const { printData, setPrintData } = useSales();
  const { showToast } = useToast();
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  // (useNotifications call moved just above the effect that reads it)

  const { items: notificationItems } = useNotifications();
  const prevLatestIdRef = React.useRef(null);

  useEffect(() => {
    const latest = notificationItems?.[0];
    if (latest && latest.id !== prevLatestIdRef.current) {
      // Skip the toast on first mount (prevLatestIdRef starts null) so we
      // don't re-announce every already-existing notification the moment
      // the layout loads — only genuinely new arrivals get a toast.
      if (prevLatestIdRef.current !== null) {
        showToast(latest.label, latest.isOverdue ? 'warning' : 'info');
      }
      prevLatestIdRef.current = latest.id;
    }
  }, [notificationItems, showToast]);

  if (printData) {
    return <PrintTemplate data={printData} onClose={() => setPrintData(null)} />;
  }

  return (
    <>
      <div className="flex h-screen bg-[#F4F6F8] font-sans text-slate-800">
        <SalesSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between gap-2 sm:gap-4 px-3 sm:px-6">
            {/* Mobile hamburger button (rendered by SalesSidebar) reserves the
                left ~52px on small screens, so the search bar starts after it
                instead of visually colliding with the logo/hamburger. */}
            <div className="flex-1 min-w-0 pl-11 lg:pl-0 max-w-xl">
              <BarcodeSearchBar />
            </div>
            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
               <NotificationBell />
              <div className="text-right hidden md:block">
                <p className="text-xs font-bold text-slate-800">{currentUser?.name}</p>
                <p className="text-[10px] text-slate-400">{currentUser?.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsChangePasswordOpen(true)}
                aria-label="Change Password"
                className="w-9 h-9 shrink-0 rounded-full bg-slate-50 text-slate-500 flex items-center justify-center hover:bg-slate-100 transition"
              >
                <KeyRound size={16} />
              </button>
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  window.location.href = '/login';
                }}
                aria-label="Logout"
                className="w-9 h-9 shrink-0 rounded-full bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100 transition"
              >
                <LogOut size={16} />
              </button>
            </div>
          </header>
          {(isChangePasswordOpen || currentUser?.mustChangePassword) && (
        <ChangePasswordModal
          forced={!!currentUser?.mustChangePassword}
          onClose={() => setIsChangePasswordOpen(false)}
        />
      )}
          <main className="flex-1 overflow-x-hidden overflow-y-auto md:p-6 relative">
            <Toast />
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </>
  );
};

const SalesLayout = () => (
  <SalesProvider>
    <NotificationProvider>
      <SalesLayoutInner />
    </NotificationProvider>
  </SalesProvider>
);

export default SalesLayout;