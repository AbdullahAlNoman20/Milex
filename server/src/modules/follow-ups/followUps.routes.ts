// src/modules/follow-ups/followUps.routes.ts
import { Router } from 'express';
import * as controller from './followUps.controller';
import { requireAuth } from '../../common/middlewares/auth.middleware';
import { requirePermission } from '../../common/middlewares/permission.middleware';
import { PERMISSIONS } from '../../common/constants/permissions.constant';

const router = Router();

router.use(requireAuth);
router.get('/', requirePermission(PERMISSIONS.VIEW_FOLLOWUP_REMINDERS, PERMISSIONS.FULL_SYSTEM_CONTROL), controller.listFollowUpsHandler);

export default router;