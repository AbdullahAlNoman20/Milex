// src/modules/notifications/notifications.routes.ts
import { Router } from 'express';
import * as controller from './notifications.controller';
import { requireAuth } from '../../common/middlewares/auth.middleware';

const router = Router();

router.use(requireAuth);
router.get('/', controller.listNotificationsHandler);

export default router;