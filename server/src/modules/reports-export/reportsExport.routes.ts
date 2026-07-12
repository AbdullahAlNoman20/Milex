// src/modules/reports-export/reportsExport.routes.ts
import { Router } from 'express';
import * as controller from './reportsExport.controller';
import { requireAuth } from '../../common/middlewares/auth.middleware';
import { requirePermission } from '../../common/middlewares/permission.middleware';
import { exportRateLimiter } from '../../common/middlewares/rateLimit.middleware';
import { PERMISSIONS } from '../../common/constants/permissions.constant';

const router = Router();

router.use(requireAuth);
// export_data is a separate permission from view_data per Section 3.25.
router.post('/', exportRateLimiter, requirePermission(PERMISSIONS.EXPORT_DATA, PERMISSIONS.FULL_SYSTEM_CONTROL), controller.requestExportHandler);

export default router;