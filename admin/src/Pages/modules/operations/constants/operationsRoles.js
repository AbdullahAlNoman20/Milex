// src/Pages/modules/operations/constants/operationsRoles.js
export const OPERATIONS_ROLES = Object.freeze({
  CLIENT: 'CLIENT',
  OPERATIONS_HEAD: 'OPERATIONS_HEAD',
  DOMESTIC_ADMIN: 'DOMESTIC_ADMIN',
  FOREIGN_ADMIN: 'FOREIGN_ADMIN',
});

export const OPERATIONS_ROLE_LABELS = Object.freeze({
  [OPERATIONS_ROLES.CLIENT]: 'Client',
  [OPERATIONS_ROLES.OPERATIONS_HEAD]: 'Operations Head',
  [OPERATIONS_ROLES.DOMESTIC_ADMIN]: 'Domestic Administrator',
  [OPERATIONS_ROLES.FOREIGN_ADMIN]: 'Foreign Administrator',
});

export const ALL_OPERATIONS_ROLES = Object.values(OPERATIONS_ROLES);