

export const ROLES = Object.freeze({
  KAM: 'KAM',
  SALES_COORDINATOR: 'SALES_COORDINATOR',
  LINE_MANAGER: 'LINE_MANAGER',
  SUPER_ADMIN: 'SUPER_ADMIN',
});

export const ROLE_LABELS = Object.freeze({
  [ROLES.KAM]: 'Key Account Manager (KAM)',
  [ROLES.SALES_COORDINATOR]: 'Sales Coordinator (SC)',
  [ROLES.LINE_MANAGER]: 'Line Manager',
  [ROLES.SUPER_ADMIN]: 'Super Admin',
});

export const ALL_ROLES = Object.values(ROLES);

// No view-only departments in the current 4-role model
export const VIEW_ONLY_ROLES = Object.freeze([]);

export const isViewOnlyRole = (role) => VIEW_ONLY_ROLES.includes(role);