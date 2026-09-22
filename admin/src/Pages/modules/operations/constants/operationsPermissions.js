// src/Pages/modules/operations/constants/operationsPermissions.js
import { OPERATIONS_ROLES } from './operationsRoles';

export const OPERATIONS_PERMISSIONS = Object.freeze({
  VIEW_DASHBOARD: 'VIEW_DASHBOARD',
});

const P = OPERATIONS_PERMISSIONS;

export const OPERATIONS_ROLE_PERMISSIONS = Object.freeze({
  [OPERATIONS_ROLES.CLIENT]: [P.VIEW_DASHBOARD],
  [OPERATIONS_ROLES.OPERATIONS_HEAD]: Object.values(P),
  [OPERATIONS_ROLES.DOMESTIC_ADMIN]: [P.VIEW_DASHBOARD],
  [OPERATIONS_ROLES.FOREIGN_ADMIN]: [P.VIEW_DASHBOARD],
});

export const hasOperationsPermission = (role, permission) =>
  Array.isArray(OPERATIONS_ROLE_PERMISSIONS[role]) && OPERATIONS_ROLE_PERMISSIONS[role].includes(permission);

export const hasAnyOperationsPermission = (role, permissions = []) =>
  permissions.some((p) => hasOperationsPermission(role, p));