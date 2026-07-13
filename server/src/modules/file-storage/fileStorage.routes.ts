// src/modules/file-storage/fileStorage.routes.ts
import { Router } from 'express';
import * as controller from './fileStorage.controller';
import { requireAuth } from '../../common/middlewares/auth.middleware';
import { requirePermission } from '../../common/middlewares/permission.middleware';
import { PERMISSIONS } from '../../common/constants/permissions.constant';

const router = Router();

router.use(requireAuth);
router.get(
  '/:key/signed-url',
  requirePermission(PERMISSIONS.VIEW_CUSTOMER_PROFILE, PERMISSIONS.FULL_SYSTEM_CONTROL),
  controller.getSignedUrlHandler
);

export default router;