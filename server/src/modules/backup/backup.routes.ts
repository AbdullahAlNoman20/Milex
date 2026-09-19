// server/src/modules/backup/backup.routes.ts
import { Router, json } from 'express';
import * as controller from './backup.controller';
import { requireAuth } from '../../common/middlewares/auth.middleware';
import { requireStaff } from '../../common/middlewares/staffOnly.middleware';
import { verifyCsrf } from '../../common/middlewares/csrf.middleware';
import { requirePermission } from '../../common/middlewares/permission.middleware';
import { exportRateLimiter } from '../../common/middlewares/rateLimit.middleware';
import { PERMISSIONS } from '../../common/constants/permissions.constant';

const router = Router();

// Backup/restore is a whole-system operation — nothing short of full system
// control may reach it. Auth and permission are checked BEFORE the large
// body parser runs, so an unauthenticated caller can never make the server
// buffer hundreds of megabytes.
router.use(requireAuth);
router.use(requireStaff);
router.use(requirePermission(PERMISSIONS.FULL_SYSTEM_CONTROL));

router.get('/stats', verifyCsrf, controller.statsHandler);
router.get('/download', verifyCsrf, exportRateLimiter, controller.downloadBackupHandler);
router.post(
  '/restore',
  exportRateLimiter,
  json({ limit: '400mb' }),
  verifyCsrf,
  controller.restoreHandler
);

export default router;