// server/src/modules/notifications/notifications.routes.ts 
import { Router } from 'express';
import * as controller from './notifications.controller';
import { requireAuth } from '../../common/middlewares/auth.middleware';
import { validateBody } from '../../common/middlewares/validate.middleware';
import { markAllReadSchema } from './notifications.schema';

const router = Router();

router.use(requireAuth);
router.get('/', controller.listNotificationsHandler);
router.post('/:id/read', controller.markReadHandler);
router.post('/read-all', validateBody(markAllReadSchema), controller.markAllReadHandler);

export default router;