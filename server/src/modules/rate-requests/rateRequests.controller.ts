// server/src/modules/rate-requests/rateRequests.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as service from './rateRequests.service';
import { sendSuccess, sendError } from '../../common/utils/apiResponse.util';
import { asString } from '../../common/utils/requestParams.util';

export const listHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await service.listRateRequests(asString(req.params.customerId), {
      id: req.user!.id,
      role: req.user!.role,
    });
    return sendSuccess(res, { items });
  } catch (err: any) {
    if (err?.statusCode) return sendError(res, err.statusCode, err.code, err.message);
    next(err);
  }
};

export const createHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const request = await service.createRateRequest(
      asString(req.params.customerId),
      req.body.reason,
      !!req.body.followsRejection,
      { id: req.user!.id, role: req.user!.role }
    );
    return sendSuccess(res, { request }, 201);
  } catch (err: any) {
    if (err?.statusCode) return sendError(res, err.statusCode, err.code, err.message);
    next(err);
  }
};

export const decideHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customer = await service.decideRateRequest(asString(req.params.requestId), req.body, {
      id: req.user!.id,
      role: req.user!.role,
    });
    return sendSuccess(res, { customer });
  } catch (err: any) {
    if (err?.statusCode) return sendError(res, err.statusCode, err.code, err.message);
    next(err);
  }
};