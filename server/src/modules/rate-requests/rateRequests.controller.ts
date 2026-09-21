// server/src/modules/rate-requests/rateRequests.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as service from './rateRequests.service';
import { sendSuccess, sendError } from '../../common/utils/apiResponse.util';
import { asString } from '../../common/utils/requestParams.util';

const fail = (res: Response, err: any, next: NextFunction) => {
  if (err?.statusCode) return sendError(res, err.statusCode, err.code, err.message);
  next(err);
};

export const listHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await service.listRateRequests(asString(req.params.customerId), {
      id: req.user!.id,
      role: req.user!.role,
    });
    return sendSuccess(res, { items });
  } catch (err: any) {
    return fail(res, err, next);
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
    return fail(res, err, next);
  }
};

export const decisionHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requester = { id: req.user!.id, role: req.user!.role };
    const customerId = asString(req.params.customerId);
    const { action, approvedRate, reason } = req.body;

    const customer =
      action === 'SET'
        ? await service.setNewRate(customerId, approvedRate, requester)
        : action === 'ESCALATE'
          ? await service.escalateRateRequestToHod(customerId, reason, requester)
          : await service.declineRateRequest(customerId, reason, requester);

    return sendSuccess(res, { customer });
  } catch (err: any) {
    return fail(res, err, next);
  }
};

export const ownerDecisionHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customer = await service.ownerDecideNewRate(
      asString(req.params.customerId),
      !!req.body.accept,
      req.body.reason,
      { id: req.user!.id, role: req.user!.role }
    );
    return sendSuccess(res, { customer });
  } catch (err: any) {
    return fail(res, err, next);
  }
};