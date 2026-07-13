// src/modules/roles-permissions/roles.routes.ts
import { Router } from 'express';
import * as controller from './roles.controller';
import { requireAuth } from '../../common/middlewares/auth.middleware';
import { requirePermission } from '../../common/middlewares/permission.middleware';
import { PERMISSIONS } from '../../common/constants/permissions.constant';

const router = Router();

router.use(requireAuth);
router.get('/', requirePermission(PERMISSIONS.MANAGE_USERS, PERMISSIONS.FULL_SYSTEM_CONTROL), controller.listRolesHandler);

export default router;