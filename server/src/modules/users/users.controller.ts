// server/src/modules/users/users.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as usersService from './users.service';
import { sendSuccess, sendError } from '../../common/utils/apiResponse.util';
import { asString } from '../../common/utils/requestParams.util';
import { assertLineManagerOwnsKam } from '../../common/utils/scopeGuard.util';

export const listKamsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lineManagerId = req.user!.role === 'LINE_MANAGER' ? req.user!.id : undefined;
    const kams = await usersService.listKams(lineManagerId);
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
    await usersService.setUserPassword(asString(req.params.id), req.body.newPassword, req.user!.id);
    return sendSuccess(res, { updated: true });
  } catch (err: any) {
    if (err?.statusCode) return sendError(res, err.statusCode, err.code, err.message);
    next(err);
  }
};

export const listUsersHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
    const result = await usersService.listUsers(page, pageSize);
    return sendSuccess(res, result);
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