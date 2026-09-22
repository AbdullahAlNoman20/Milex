// server/src/modules/users/users.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as usersService from './users.service';
import { sendSuccess, sendError } from '../../common/utils/apiResponse.util';
import { asString, asOptionalString } from '../../common/utils/requestParams.util';
import { assertLineManagerOwnsKam } from '../../common/utils/scopeGuard.util';

const ASSIGNABLE_ROLE_NAMES = [
  'KAM',
  'SALES_COORDINATOR',
  'LINE_MANAGER',
  'HEAD_OF_DEPARTMENT',
  'SUPER_ADMIN',
  'CUSTOMER',
];

export const listMyTeamHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await usersService.listMyTeam({ id: req.user!.id, role: req.user!.role });
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

export const listKamsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lineManagerId = req.user!.role === 'LINE_MANAGER' ? req.user!.id : undefined;
    // The assignment picker asks for managers too, so an account can be held
    // by the person who raised it.
    const includeManagers = String(req.query.includeManagers ?? '') === 'true';
    const kams = await usersService.listKams(lineManagerId, includeManagers);
    return sendSuccess(res, { kams });
  } catch (err: any) {
    if (err?.statusCode) return sendError(res, err.statusCode, err.code, err.message);
    next(err);
  }
};

export const listLineManagersHandler = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const lineManagers = await usersService.listLineManagers();
    return sendSuccess(res, { lineManagers });
  } catch (err: any) {
    if (err?.statusCode) return sendError(res, err.statusCode, err.code, err.message);
    next(err);
  }
};

export const setUserPasswordHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await usersService.setUserPassword(
      asString(req.params.id),
      req.body.newPassword,
      req.user!.id,
      req.body.requirePasswordChange !== false
    );
    return sendSuccess(res, { updated: true });
  } catch (err: any) {
    if (err?.statusCode) return sendError(res, err.statusCode, err.code, err.message);
    next(err);
  }
};

export const listUsersHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    // Paged in the database now, so there is no ceiling on how many accounts
    // the console can reach — only on how many travel per request.
    const pageSize = Math.min(500, Math.max(1, Number(req.query.pageSize) || 10));
    const roleFilter = asOptionalString(req.query.role);
    const statusFilter = asOptionalString(req.query.status);
    const result = await usersService.listUsers(page, pageSize, {
      search: asOptionalString(req.query.search),
      role: roleFilter && ASSIGNABLE_ROLE_NAMES.includes(roleFilter) ? roleFilter : undefined,
      status: statusFilter === 'active' || statusFilter === 'inactive' ? statusFilter : undefined,
    });
    return sendSuccess(res, result);
  } catch (err: any) {
    if (err?.statusCode) return sendError(res, err.statusCode, err.code, err.message);
    next(err);
  }
};

export const listCustomerAccountsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(200, Math.max(1, Number(req.query.pageSize) || 10));
    const result = await usersService.listCustomerAccounts(page, pageSize, asOptionalString(req.query.search));
    return sendSuccess(res, result);
  } catch (err: any) {
    if (err?.statusCode) return sendError(res, err.statusCode, err.code, err.message);
    next(err);
  }
};

export const updateCustomerAccountEmailHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await usersService.updateCustomerAccountEmail(
      asString(req.params.id),
      req.body.email,
      req.user!.id
    );
    return sendSuccess(res, { user });
  } catch (err: any) {
    if (err?.statusCode) return sendError(res, err.statusCode, err.code, err.message);
    next(err);
  }
};

export const getUserStatsHandler = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await usersService.getUserStats();
    return sendSuccess(res, stats);
  } catch (err: any) {
    if (err?.statusCode) return sendError(res, err.statusCode, err.code, err.message);
    next(err);
  }
};

export const createUserHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await usersService.createUser(req.body, req.user!.id);
    return sendSuccess(res, { user }, 201);
  } catch (err: any) {
    if (err?.statusCode) return sendError(res, err.statusCode, err.code, err.message);
    next(err);
  }
};

export const updateUserHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await usersService.updateUser(asString(req.params.id), req.body, req.user!.id);
    return sendSuccess(res, { user });
  } catch (err: any) {
    if (err?.statusCode) return sendError(res, err.statusCode, err.code, err.message);
    next(err);
  }
};

export const listDirectoryHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lineManagerId = req.user!.role === 'LINE_MANAGER' ? req.user!.id : undefined;
    const staff = await usersService.listStaffDirectory(lineManagerId);
    return sendSuccess(res, { staff });
  } catch (err: any) {
    if (err?.statusCode) return sendError(res, err.statusCode, err.code, err.message);
    next(err);
  }
};

export const getMyActivityHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.id) return sendError(res, 401, 'UNAUTHENTICATED', 'Not authenticated');
    const items = await usersService.getUserActivity(req.user.id);
    return sendSuccess(res, { items });
  } catch (err: any) {
    if (err?.statusCode) return sendError(res, err.statusCode, err.code, err.message);
    next(err);
  }
};

export const bulkImportKamsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await usersService.bulkCreateKams(
      req.body.rows,
      req.body.lineManagerId || null,
      req.user!.id
    );
    return sendSuccess(res, result, 201);
  } catch (err: any) {
    if (err?.statusCode) return sendError(res, err.statusCode, err.code, err.message);
    next(err);
  }
};

export const getUserActivityHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const targetId = asString(req.params.id);
    if (!targetId) return sendError(res, 400, 'MISSING_ID', 'User id is required');
    if (req.user!.role === 'LINE_MANAGER' && targetId !== req.user!.id) {
      await assertLineManagerOwnsKam(targetId, req.user!.id);
    }
    const items = await usersService.getUserActivity(targetId);
    return sendSuccess(res, { items });
  } catch (err: any) {
    if (err?.statusCode) return sendError(res, err.statusCode, err.code, err.message);
    next(err);
  }
};