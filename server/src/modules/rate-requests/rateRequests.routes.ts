// server/src/modules/rate-requests/rateRequests.routes.ts
import { Router } from "express";
import * as controller from "./rateRequests.controller";
import { requireAuth } from '../../common/middlewares/auth.middleware';
import { requireStaff } from '../../common/middlewares/staffOnly.middleware';
import { verifyCsrf } from "../../common/middlewares/csrf.middleware";
import { requirePermission } from "../../common/middlewares/permission.middleware";
import { validateBody } from "../../common/middlewares/validate.middleware";
import { PERMISSIONS } from "../../common/constants/permissions.constant";
import {
  createRateRequestSchema,
  decideRateRequestSchema,
} from "./rateRequests.schema";

const router = Router();

router.use(requireAuth);
router.use(requireStaff);
router.use(verifyCsrf);

router.get(
  "/customer/:customerId",
  requirePermission(
    PERMISSIONS.VIEW_CUSTOMER_PROFILE,
    PERMISSIONS.FULL_SYSTEM_CONTROL,
  ),
  controller.listHandler,
);

router.post(
  "/customer/:customerId",
  requirePermission(
    PERMISSIONS.REQUEST_NEW_RATE,
    PERMISSIONS.REVISE_RECOMMENDATION,
    PERMISSIONS.FULL_SYSTEM_CONTROL,
  ),
  validateBody(createRateRequestSchema),
  controller.createHandler,
);

router.post(
  "/:requestId/decision",
  requirePermission(
    PERMISSIONS.GRANT_NEW_RATE,
    PERMISSIONS.FULL_SYSTEM_CONTROL,
  ),
  validateBody(decideRateRequestSchema),
  controller.decideHandler,
);

export default router;
