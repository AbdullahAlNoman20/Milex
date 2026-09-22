// src/Pages/modules/operations/components/OperationsRoleRoute.jsx
import { Navigate, Outlet } from 'react-router-dom';
import { useOperationsAuth } from '../hooks/useOperationsAuth';
import { hasAnyOperationsPermission } from '../constants/operationsPermissions';
import { ALL_OPERATIONS_ROLES } from '../constants/operationsRoles';

const OperationsRoleRoute = ({ allowedRoles = [], requiredPermissions = [], children }) => {
  const { currentUser, isAuthenticated } = useOperationsAuth();

  if (!isAuthenticated || !currentUser) {
    return <Navigate to="/operations/login" replace />;
  }

  const role = currentUser.role;
  const validRole = ALL_OPERATIONS_ROLES.includes(role);

  if (!validRole) {
    return <Navigate to="/operations/login" replace />;
  }

  const roleAllowed = allowedRoles.length === 0 || allowedRoles.includes(role);
  const permissionAllowed =
    requiredPermissions.length === 0 || hasAnyOperationsPermission(role, requiredPermissions);

  if (!roleAllowed || !permissionAllowed) {
    return <Navigate to="/operations/unauthorized" replace />;
  }

  return children ?? <Outlet />;
};

export default OperationsRoleRoute;