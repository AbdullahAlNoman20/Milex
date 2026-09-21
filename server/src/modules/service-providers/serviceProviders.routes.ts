// server/src/modules/service-providers/serviceProviders.routes.ts
import { Router } from 'express';
import * as controller from './serviceProviders.controller';
import { requireAuth } from '../../common/middlewares/auth.middleware';
import { requireStaff } from '../../common/middlewares/staffOnly.middleware';

const router = Router();

router.use(requireAuth);
// Authenticated but previously ungated, so a customer login could read the
// company's carrier list.
router.use(requireStaff);
router.get('/', controller.listHandler);

export default router;