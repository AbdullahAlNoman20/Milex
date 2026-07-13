// src/modules/customers/customers.routes.ts
import { Router } from 'express';
import * as controller from './customers.controller';
import { requireAuth } from '../../common/middlewares/auth.middleware';
import { requirePermission } from '../../common/middlewares/permission.middleware';
import { validateBody, validateQuery } from '../../common/middlewares/validate.middleware';
import { verifyCsrf } from '../../common/middlewares/csrf.middleware';
import { searchRateLimiter } from '../../common/middlewares/rateLimit.middleware';
import { PERMISSIONS } from '../../common/constants/permissions.constant';
import {
  createRecommendationSchema,
  approveRateSchema,
  offerTextSchema,
  agreementTextSchema,
  clientFeedbackSchema,
  requestInfoUpdateSchema,
  decideInfoUpdateSchema,
  followUpUpdateSchema,
  listCustomersQuerySchema,
} from './customers.schema';

const router = Router();

router.use(requireAuth);
router.use(verifyCsrf);

router.get(
  '/',
  searchRateLimiter,
  validateQuery(listCustomersQuerySchema),
  requirePermission(PERMISSIONS.VIEW_CUSTOMER_PROFILE, PERMISSIONS.FULL_SYSTEM_CONTROL),
  controller.listCustomersHandler
);

router.get(
  '/:barcode',
  requirePermission(PERMISSIONS.VIEW_CUSTOMER_PROFILE, PERMISSIONS.FULL_SYSTEM_CONTROL),
  controller.getCustomerHandler
);

router.post(
  '/',
  requirePermission(PERMISSIONS.CREATE_RECOMMENDATION),
  validateBody(createRecommendationSchema),
  controller.createRecommendationHandler
);

router.post('/:id/approve-rate', requirePermission(PERMISSIONS.APPROVE_RATE), validateBody(approveRateSchema), controller.approveRateHandler);
router.post('/:id/reject-rate', requirePermission(PERMISSIONS.REJECT_RATE), controller.rejectRateHandler);
router.post('/:id/draft-offer', requirePermission(PERMISSIONS.DRAFT_OFFER), controller.draftOfferHandler);
router.post('/:id/finalize-offer', requirePermission(PERMISSIONS.FINALIZE_OFFER), validateBody(offerTextSchema), controller.finalizeOfferHandler);
router.post('/:id/client-feedback', requirePermission(PERMISSIONS.REQUEST_INFO_UPDATE), validateBody(clientFeedbackSchema), controller.clientFeedbackHandler);
router.post('/:id/revise-rate', requirePermission(PERMISSIONS.REVISE_RECOMMENDATION), controller.reviseRateHandler);
router.post('/:id/draft-agreement', requirePermission(PERMISSIONS.DRAFT_AGREEMENT), controller.draftAgreementHandler);
router.post('/:id/finalize-agreement', requirePermission(PERMISSIONS.FINALIZE_AGREEMENT), validateBody(agreementTextSchema), controller.finalizeAgreementHandler);
router.post('/:id/activate-provisional', requirePermission(PERMISSIONS.UPLOAD_SIGNED_AGREEMENT), controller.activateProvisionalHandler);
router.post('/:id/activate-direct', requirePermission(PERMISSIONS.ACTIVATE_PROFILE), controller.activateDirectHandler);
router.post('/:id/request-info-update', requirePermission(PERMISSIONS.REQUEST_INFO_UPDATE), validateBody(requestInfoUpdateSchema), controller.requestInfoUpdateHandler);
router.post('/:id/decide-info-update', requirePermission(PERMISSIONS.APPROVE_INFO_UPDATE), validateBody(decideInfoUpdateSchema), controller.decideInfoUpdateHandler);
router.patch('/:id/follow-up', requirePermission(PERMISSIONS.VIEW_FOLLOWUP_REMINDERS), validateBody(followUpUpdateSchema), controller.updateFollowUpHandler);

export default router;