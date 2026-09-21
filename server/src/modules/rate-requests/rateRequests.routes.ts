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
  rateDecisionSchema,
  ownerDecisionSchema,
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
    PERMISSIONS.CREATE_RECOMMENDATION,
    PERMISSIONS.FULL_SYSTEM_CONTROL,
  ),
  validateBody(createRateRequestSchema),
  controller.createHandler,
);

// Set the rate, pass it up, or decline it. The service checks which of the
// three the caller's role and the account's current desk actually allow.
router.post(
  "/customer/:customerId/decision",
  requirePermission(
    PERMISSIONS.APPROVE_RATE,
    PERMISSIONS.GRANT_NEW_RATE,
    PERMISSIONS.FULL_SYSTEM_CONTROL,
  ),
  validateBody(rateDecisionSchema),
  controller.decisionHandler,
);

router.post(
  "/customer/:customerId/owner-decision",
  requirePermission(
    PERMISSIONS.CREATE_RECOMMENDATION,
    PERMISSIONS.REVISE_RECOMMENDATION,
    PERMISSIONS.FULL_SYSTEM_CONTROL,
  ),
  validateBody(ownerDecisionSchema),
  controller.ownerDecisionHandler,
);

export default router;