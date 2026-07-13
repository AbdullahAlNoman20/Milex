// server/src/modules/customers/customers.controller.ts 
import { Request, Response, NextFunction } from 'express';
import * as customersService from './customers.service';
import { sendSuccess, sendError } from '../../common/utils/apiResponse.util';
import { asString, asOptionalString } from '../../common/utils/requestParams.util';

export const listCustomersHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
    const result = await customersService.listCustomers(
      page,
      pageSize,
      { status: asOptionalString(req.query.status), search: asOptionalString(req.query.search) },
      { id: req.user!.id, role: req.user!.role }
    );
    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

export const getCustomerHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customer = await customersService.getCustomerByBarcode(asString(req.params.barcode), {
      id: req.user!.id,
      role: req.user!.role,
    });
    return sendSuccess(res, { customer });
  } catch (err: any) {
    if (err?.statusCode) return sendError(res, err.statusCode, err.code, err.message);
    next(err);
  }
};

export const createRecommendationHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customer = await customersService.createRecommendation(req.body, req.user!.id);
    return sendSuccess(res, { customer }, 201);
  } catch (err) {
    next(err);
  }
};

const wrap = (fn: (req: Request) => Promise<unknown>) => async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await fn(req);
    return sendSuccess(res, { customer: result });
  } catch (err: any) {
    if (err?.statusCode) return sendError(res, err.statusCode, err.code, err.message);
    next(err);
  }
};

export const approveRateHandler = wrap((req) => customersService.approveRate(asString(req.params.id), req.body, req.user!.id));
export const rejectRateHandler = wrap((req) => customersService.rejectRate(asString(req.params.id), req.user!.id));
export const draftOfferHandler = wrap((req) => customersService.draftOffer(asString(req.params.id), req.user!.id));
export const finalizeOfferHandler = wrap((req) =>
  customersService.finalizeOffer(asString(req.params.id), req.body.offerText, req.user!.id)
);
export const sendAgreementHandler = wrap((req) =>
  customersService.sendAgreement(asString(req.params.id), req.body.agreementText, req.user!.id)
);
export const clientFeedbackHandler = wrap((req) =>
  customersService.submitClientFeedback(asString(req.params.id), req.body, req.user!.id)
);
export const reviseRateHandler = wrap((req) =>
  customersService.reviseRateAfterRejection(asString(req.params.id), req.body.proposedRate, req.user!.id)
);
export const draftAgreementHandler = wrap((req) => customersService.draftAgreement(asString(req.params.id), req.user!.id));
export const finalizeAgreementHandler = wrap((req) =>
  customersService.finalizeAgreement(asString(req.params.id), req.body.agreementText, req.user!.id)
);
export const activateProvisionalHandler = wrap((req) => customersService.activateAsProvisional(asString(req.params.id), req.user!.id));
export const activateDirectHandler = wrap((req) => customersService.activateDirectly(asString(req.params.id), req.user!.id));
export const requestInfoUpdateHandler = wrap((req) =>
  customersService.requestInfoUpdate(asString(req.params.id), req.body.field, req.body.newValue, req.user!.id)
);
export const decideInfoUpdateHandler = wrap((req) =>
  customersService.decideInfoUpdate(asString(req.params.id), req.body.approve, req.user!.id)
);
export const updateFollowUpHandler = wrap((req) => customersService.updateFollowUp(asString(req.params.id), req.body, req.user!.id));

export const listFollowUpsHandler = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await customersService.deriveFollowUps();
    return sendSuccess(res, { items });
  } catch (err) {
    next(err);
  }
};