// src/modules/roles-permissions/roles.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as rolesService from './roles.service';
import { sendSuccess } from '../../common/utils/apiResponse.util';

export const listRolesHandler = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const roles = await rolesService.listRolesWithPermissions();
    return sendSuccess(res, { roles });
  } catch (err) {
    next(err);
  }
};