// server/src/modules/users/users.routes.ts 
import { Router } from 'express';
import * as controller from './users.controller';
import { requireAuth } from '../../common/middlewares/auth.middleware';
import { requirePermission, requireOwnershipOrPermission } from '../../common/middlewares/permission.middleware';
import { validateBody } from '../../common/middlewares/validate.middleware';
import { createUserSchema, updateUserSchema } from './users.schema';
import { PERMISSIONS } from '../../common/constants/permissions.constant';
import { asString } from '../../common/utils/requestParams.util';

const router = Router();

router.use(requireAuth);

router.get('/kams', requirePermission(PERMISSIONS.VIEW_ALL_KAM_DASHBOARDS, PERMISSIONS.MANAGE_USERS, PERMISSIONS.FULL_SYSTEM_CONTROL, PERMISSIONS.CREATE_RECOMMENDATION), controller.listKamsHandler);
router.get('/directory', requirePermission(PERMISSIONS.VIEW_ACTIVITY_LOG, PERMISSIONS.VIEW_ALL_KAM_DASHBOARDS, PERMISSIONS.FULL_SYSTEM_CONTROL), controller.listDirectoryHandler);

// IMPORTANT: /me/activity must be registered before /:id/activity, otherwise
// Express matches "me" as an :id param on the wildcard route below.
router.get('/me/activity', controller.getMyActivityHandler);
router.get('/:id/activity', requireOwnershipOrPermission((req) => asString(req.params.id), PERMISSIONS.VIEW_ACTIVITY_LOG), controller.getUserActivityHandler);

router.get('/', requirePermission(PERMISSIONS.MANAGE_USERS, PERMISSIONS.FULL_SYSTEM_CONTROL), controller.listUsersHandler);
router.post(
  '/',
  requirePermission(PERMISSIONS.MANAGE_USERS, PERMISSIONS.FULL_SYSTEM_CONTROL),
  validateBody(createUserSchema),
  controller.createUserHandler
);
router.patch(
  '/:id',
  requirePermission(PERMISSIONS.MANAGE_USERS, PERMISSIONS.FULL_SYSTEM_CONTROL),
  validateBody(updateUserSchema),
  controller.updateUserHandler
);

export default router;