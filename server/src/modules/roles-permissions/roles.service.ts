// src/modules/roles-permissions/roles.service.ts
import { prisma } from '../../config/db';

export const listRolesWithPermissions = async () => {
  const roles = await prisma.role.findMany({
    include: { permissions: { include: { permission: true } } },
  });
  return roles.map((r) => ({
    name: r.name,
    permissions: r.permissions.map((rp) => rp.permission.key),
  }));
};