// server/src/modules/daily-reports/dailyReports.routes.ts
import { Router } from 'express';
import * as controller from './dailyReports.controller';
import { requireAuth } from '../../common/middlewares/auth.middleware';
import { requirePermission } from '../../common/middlewares/permission.middleware';
import { validateBody } from '../../common/middlewares/validate.middleware';
import { verifyCsrf } from '../../common/middlewares/csrf.middleware';
import { PERMISSIONS } from '../../common/constants/permissions.constant';
import { upsertDailyReportSchema } from './dailyReports.schema';

const router = Router();

router.use(requireAuth);
router.use(verifyCsrf);

router.get('/mine', requirePermission(PERMISSIONS.SUBMIT_DAILY_REPORT), controller.listMineHandler);
router.get('/kam/:kamId', requirePermission(PERMISSIONS.VIEW_ALL_KAM_DASHBOARDS, PERMISSIONS.FULL_SYSTEM_CONTROL), controller.listForKamHandler);
router.get('/:date', requirePermission(PERMISSIONS.SUBMIT_DAILY_REPORT), controller.getByDateHandler);
router.post('/', requirePermission(PERMISSIONS.SUBMIT_DAILY_REPORT), validateBody(upsertDailyReportSchema), controller.upsertReportHandler);

export default router;