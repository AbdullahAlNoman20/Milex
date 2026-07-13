// src/modules/weekly-plans/weeklyPlans.routes.ts
import { Router } from 'express';
import * as controller from './weeklyPlans.controller';
import { requireAuth } from '../../common/middlewares/auth.middleware';
import { requirePermission } from '../../common/middlewares/permission.middleware';
import { validateBody } from '../../common/middlewares/validate.middleware';
import { verifyCsrf } from '../../common/middlewares/csrf.middleware';
import { PERMISSIONS } from '../../common/constants/permissions.constant';
import { upsertPlanSchema, reviewPlanSchema } from './weeklyPlans.schema';

const router = Router();

router.use(requireAuth);
router.use(verifyCsrf);

router.get('/mine', requirePermission(PERMISSIONS.SUBMIT_WEEKLY_PLAN), controller.listMinePlansHandler);
router.get('/review', requirePermission(PERMISSIONS.REVIEW_WEEKLY_PLAN), controller.listForReviewHandler);
router.get('/kam/:kamId', requirePermission(PERMISSIONS.VIEW_ALL_KAM_DASHBOARDS, PERMISSIONS.FULL_SYSTEM_CONTROL), controller.listForKamHandler);
router.post('/draft', requirePermission(PERMISSIONS.SUBMIT_WEEKLY_PLAN), validateBody(upsertPlanSchema), controller.saveDraftHandler);
router.post('/submit', requirePermission(PERMISSIONS.SUBMIT_WEEKLY_PLAN), controller.submitPlanHandler);
router.post('/:id/review', requirePermission(PERMISSIONS.REVIEW_WEEKLY_PLAN), validateBody(reviewPlanSchema), controller.reviewPlanHandler);

export default router;