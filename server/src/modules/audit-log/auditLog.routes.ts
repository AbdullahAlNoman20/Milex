// server/src/modules/audit-log/auditLog.routes.ts
import { Router } from "express";
import * as controller from "./auditLog.controller";
import { requireAuth } from "../../common/middlewares/auth.middleware";
import { verifyCsrf } from "../../common/middlewares/csrf.middleware";
import { requirePermission } from "../../common/middlewares/permission.middleware";
import { PERMISSIONS } from "../../common/constants/permissions.constant";

const router = Router();

router.use(requireAuth);
router.use(verifyCsrf);
router.get(
  "/",
  requirePermission(
    PERMISSIONS.VIEW_AUDIT_LOG,
    PERMISSIONS.FULL_SYSTEM_CONTROL,
  ),
  controller.listAuditLogsHandler,
);

export default router;
