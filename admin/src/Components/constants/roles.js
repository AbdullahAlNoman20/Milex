// admin/src/Components/constants/roles.js
export const ROLES = Object.freeze({
  KAM: 'KAM',
  SALES_COORDINATOR: 'SALES_COORDINATOR',
  LINE_MANAGER: 'LINE_MANAGER',
  HEAD_OF_DEPARTMENT: 'HEAD_OF_DEPARTMENT',
  SUPER_ADMIN: 'SUPER_ADMIN',
  CUSTOMER: 'CUSTOMER',
});

export const ROLE_LABELS = Object.freeze({
  [ROLES.KAM]: 'Key Account Manager (KAM)',
  [ROLES.SALES_COORDINATOR]: 'Sales Coordinator (SC)',
  [ROLES.LINE_MANAGER]: 'Line Manager',
  [ROLES.HEAD_OF_DEPARTMENT]: 'Head of Department (HOD)',
  [ROLES.SUPER_ADMIN]: 'Super Admin',
  [ROLES.CUSTOMER]: 'Customer',
});

export const ALL_ROLES = Object.values(ROLES);

// Roles that work inside the sales application. A CUSTOMER account exists so
// the person has an identity and a login, but has nothing to open here yet —
// keeping it out of this list is what stops the sales screens from trying to
// render for them.
export const STAFF_ROLES = Object.freeze([
  ROLES.KAM,
  ROLES.SALES_COORDINATOR,
  ROLES.LINE_MANAGER,
  ROLES.HEAD_OF_DEPARTMENT,
  ROLES.SUPER_ADMIN,
]);

export const isStaffRole = (role) => STAFF_ROLES.includes(role);

// Roles that sit above the individual account handlers and can see across
// teams rather than only their own records.
export const ELEVATED_ROLES = Object.freeze([
  ROLES.LINE_MANAGER,
  ROLES.HEAD_OF_DEPARTMENT,
  ROLES.SUPER_ADMIN,
]);

export const isElevatedRole = (role) => ELEVATED_ROLES.includes(role);

// No view-only departments in the current role model
export const VIEW_ONLY_ROLES = Object.freeze([]);

export const isViewOnlyRole = (role) => VIEW_ONLY_ROLES.includes(role);