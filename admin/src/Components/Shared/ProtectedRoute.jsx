// src/Components/Shared/ProtectedRoute.jsx
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { isStaffRole } from '../constants/roles';
import Loader from './Loader';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, currentUser, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return <Loader fullScreen label="Restoring session..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // A customer's login exists so their identity is in place, but there is
  // nothing here for them to open yet. Letting them through would drop them
  // onto screens built entirely around internal data.
  if (!isStaffRole(currentUser?.role)) {
    return <Navigate to="/no-access" replace />;
  }

  return children ?? <Outlet />;
};

export default ProtectedRoute;