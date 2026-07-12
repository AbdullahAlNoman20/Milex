// src/modules/onboarding/onboarding.routes.ts
import { Router } from 'express';
import * as controller from './onboarding.controller';
import { requireAuth } from '../../common/middlewares/auth.middleware';
import { requirePermission } from '../../common/middlewares/permission.middleware';
import { validateBody } from '../../common/middlewares/validate.middleware';
import { uploadMiddleware } from '../../common/middlewares/upload.middleware';
import { verifyCsrf } from '../../common/middlewares/csrf.middleware';
import { PERMISSIONS } from '../../common/constants/permissions.constant';
import {
  requestExtensionSchema,
  decideExtensionSchema,
  finalOnboardingDecisionSchema,
} from './onboarding.schema';

const router = Router();

router.use(requireAuth);
router.use(verifyCsrf);

router.post(
  '/:id/documents',
  requirePermission(PERMISSIONS.UPLOAD_ONBOARDING_DOCUMENT),
  uploadMiddleware.array('files', 10),
  controller.uploadDocumentHandler
);

router.post(
  '/:id/extension-request',
  requirePermission(PERMISSIONS.REQUEST_TIME_EXTENSION),
  validateBody(requestExtensionSchema),
  controller.requestExtensionHandler
);

router.post(
  '/extension-request/:requestId/decision',
  requirePermission(PERMISSIONS.EXTEND_PROVISIONAL_PERIOD),
  validateBody(decideExtensionSchema),
  controller.decideExtensionHandler
);

router.post(
  '/:id/final-onboarding',
  requirePermission(PERMISSIONS.SUBMIT_FINAL_ONBOARDING),
  controller.submitFinalOnboardingHandler
);

router.post(
  '/:id/final-onboarding/decision',
  requirePermission(PERMISSIONS.FINALIZE_ONBOARDING),
  validateBody(finalOnboardingDecisionSchema),
  controller.decideFinalOnboardingHandler
);

export default router;