// src/modules/audit-log/auditLog.routes.ts
import { Router } from 'express';
import * as controller from './auditLog.controller';
import { requireAuth } from '../../common/middlewares/auth.middleware';
import { requirePermission } from '../../common/middlewares/permission.middleware';
import { PERMISSIONS } from '../../common/constants/permissions.constant';

const router = Router();

router.use(requireAuth);
// audit_log has no application-layer UPDATE/DELETE route at all — write-only via logAudit().
router.get('/', requirePermission(PERMISSIONS.VIEW_AUDIT_LOG, PERMISSIONS.FULL_SYSTEM_CONTROL), controller.listAuditLogsHandler);

export default router;