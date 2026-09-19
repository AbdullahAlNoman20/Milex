// server/src/common/middlewares/staffOnly.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/apiResponse.util';

// A customer's account carries no permissions, so every guarded route already
// refuses it. This closes the remaining gap: a route that is authenticated but
// has no permission check of its own would otherwise be open to them.
//
// Applied per-router rather than inside requireAuth, because the auth routes
// themselves (reading your own profile, changing your password, signing out)
// must stay reachable by a customer.
export const requireStaff = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role === 'CUSTOMER') {
    return sendError(
      res,
      403,
      'FORBIDDEN',
      'This area is for Milex staff. Your customer portal is coming soon.',
    );
  }
  next();
};