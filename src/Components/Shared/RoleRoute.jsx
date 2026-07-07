// src/Components/Shared/RoleRoute.jsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { hasAnyPermission } from '../constants/permissions';
import { ALL_ROLES } from '../constants/roles';

const RoleRoute = ({ allowedRoles = [], requiredPermissions = [], children }) => {
  const { currentUser, isAuthenticated } = useAuth();

  if (!isAuthenticated || !currentUser) {
    return <Navigate to="/login" replace />;
  }

  const role = currentUser.role;
  const validRole = ALL_ROLES.includes(role);

  if (!validRole) {
    return <Navigate to="/login" replace />;
  }

  const roleAllowed = allowedRoles.length === 0 || allowedRoles.includes(role);
  const permissionAllowed =
    requiredPermissions.length === 0 || hasAnyPermission(role, requiredPermissions);

  if (!roleAllowed || !permissionAllowed) {
    return <Navigate to="/app/unauthorized" replace />;
  }

  return children ?? <Outlet />;
};

export default RoleRoute;