// src/Pages/modules/sales/layout/SalesLayout.jsx
import { Outlet } from 'react-router-dom';
import { SalesProvider } from '../context/SalesContext';
import SalesSidebar from './SalesSidebar';
import { useEffect } from 'react';
import Toast from '../../../../Components/Shared/Toast';
import { useToast } from '../../../../Components/hooks/useToast';
import { getSocket } from '../../../../Components/services/socketService';
import { listNotifications } from '../../../../Components/services/notificationService';
import ErrorBoundary from '../../../../Components/Shared/ErrorBoundary';
import BarcodeSearchBar from '../components/BarcodeSearchBar';
import PrintTemplate from '../components/PrintTemplate';
import { useAuth } from '../../../../Components/hooks/useAuth';
import { useSales } from '../hooks/useSales';
import NotificationBell from '../../../../Components/Shared/NotificationBell';
import { LogOut } from 'lucide-react';

const SalesLayoutInner = () => {
  const { currentUser, logout } = useAuth();
  const { printData, setPrintData } = useSales();
  const { showToast } = useToast();

  useEffect(() => {
    const socket = getSocket();
    const handleNew = () => {
      listNotifications(1)
        .then((data) => {
          const latest = data.items?.[0];
          if (latest) showToast(latest.label, latest.isOverdue ? 'warning' : 'info');
        })
        .catch(() => {});
    };
    socket.on('notification:new', handleNew);
    return () => socket.off('notification:new', handleNew);
  }, [showToast]);

  if (printData) {
    return <PrintTemplate data={printData} onClose={() => setPrintData(null)} />;
  }

  return (
    <>
      <div className="flex h-screen bg-[#F4F6F8] font-sans text-slate-800">
        <SalesSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
            <div className="flex-1 max-w-xl">
              <BarcodeSearchBar />
            </div>
            <div className="flex items-center gap-4">
              <NotificationBell />
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-slate-800">{currentUser?.name}</p>
                <p className="text-[10px] text-slate-400">{currentUser?.email}</p>
              </div>
              <button
                type="button"
                onClick={logout}
                aria-label="Logout"
                className="w-9 h-9 rounded-full bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100 transition"
              >
                <LogOut size={16} />
              </button>
            </div>
          </header>
          <main className="flex-1 overflow-x-hidden overflow-y-auto p-6 relative">
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
    <SalesLayoutInner />
  </SalesProvider>
);

export default SalesLayout;