// src/Components/constants/roles.js
export const ROLES = Object.freeze({
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  LINE_MANAGER: 'LINE_MANAGER',
  SALES_COORDINATOR: 'SALES_COORDINATOR',
  KAM: 'KAM',
  OPERATIONS: 'OPERATIONS',
  ACCOUNTS: 'ACCOUNTS',
});

export const ROLE_LABELS = Object.freeze({
  [ROLES.SUPER_ADMIN]: 'Super Admin',
  [ROLES.ADMIN]: 'Admin',
  [ROLES.LINE_MANAGER]: 'Line Manager (Head of Sales)',
  [ROLES.SALES_COORDINATOR]: 'Sales Coordinator',
  [ROLES.KAM]: 'Sales Executive (KAM)',
  [ROLES.OPERATIONS]: 'Operations Department',
  [ROLES.ACCOUNTS]: 'Accounts Department',
});

export const ALL_ROLES = Object.values(ROLES);

export const VIEW_ONLY_ROLES = Object.freeze([ROLES.OPERATIONS, ROLES.ACCOUNTS]);

export const isViewOnlyRole = (role) => VIEW_ONLY_ROLES.includes(role);