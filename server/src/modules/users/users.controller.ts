// server/src/modules/users/users.controller.ts 
import { Request, Response, NextFunction } from 'express';
import * as usersService from './users.service';
import { sendSuccess, sendError } from '../../common/utils/apiResponse.util';
import { asString } from '../../common/utils/requestParams.util';

export const listKamsHandler = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const kams = await usersService.listKams();
    return sendSuccess(res, { kams });
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

export const listDirectoryHandler = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const staff = await usersService.listStaffDirectory();
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
    const items = await usersService.getUserActivity(targetId);
    return sendSuccess(res, { items });
  } catch (err: any) {
    if (err?.statusCode) return sendError(res, err.statusCode, err.code, err.message);
    next(err);
  }
};