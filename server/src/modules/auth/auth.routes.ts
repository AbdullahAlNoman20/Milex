// src/modules/auth/auth.routes.ts
import { Router } from 'express';
import * as controller from './auth.controller';
import { validateBody } from '../../common/middlewares/validate.middleware';
import { requireAuth } from '../../common/middlewares/auth.middleware';
import { loginRateLimiter, mfaRateLimiter } from '../../common/middlewares/rateLimit.middleware';
import {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  enableMfaVerifySchema,
} from './auth.schema';

const router = Router();

router.post('/login', loginRateLimiter, validateBody(loginSchema), controller.loginHandler);
router.post('/refresh', controller.refreshHandler);
router.post('/logout', requireAuth, controller.logoutHandler);
router.post('/forgot-password', loginRateLimiter, validateBody(forgotPasswordSchema), controller.forgotPasswordHandler);
router.post('/reset-password', loginRateLimiter, validateBody(resetPasswordSchema), controller.resetPasswordHandler);
router.post('/mfa/setup', requireAuth, controller.setupMfaHandler);
router.post('/mfa/confirm', requireAuth, mfaRateLimiter, validateBody(enableMfaVerifySchema), controller.confirmMfaHandler);
router.get('/me', requireAuth, controller.meHandler);

export default router;