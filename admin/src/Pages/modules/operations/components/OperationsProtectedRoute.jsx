// src/Pages/modules/operations/components/OperationsProtectedRoute.jsx
import { Navigate, Outlet } from 'react-router-dom';
import { useOperationsAuth } from '../hooks/useOperationsAuth';
import Loader from '../../../../Components/Shared/Loader';

const OperationsProtectedRoute = ({ children }) => {
  const { isAuthenticated, isInitializing } = useOperationsAuth();

  if (isInitializing) {
    return <Loader fullScreen label="Restoring session..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/operations/login" replace />;
  }

  return children ?? <Outlet />;
};

export default OperationsProtectedRoute;