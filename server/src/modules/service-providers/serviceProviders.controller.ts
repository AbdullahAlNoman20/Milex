// server/src/modules/service-providers/serviceProviders.controller.ts 
import { Request, Response, NextFunction } from 'express';
import * as service from './serviceProviders.service';
import { sendSuccess } from '../../common/utils/apiResponse.util';

export const listHandler = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const providers = await service.listServiceProviders();
    return sendSuccess(res, { providers });
  } catch (err) {
    next(err);
  }
};