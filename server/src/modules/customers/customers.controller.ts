// server/src/modules/customers/customers.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as customersService from './customers.service';
import { sendSuccess, sendError } from '../../common/utils/apiResponse.util';
import { asString, asOptionalString } from '../../common/utils/requestParams.util';

export const listCustomersHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(300, Math.max(1, Number(req.query.pageSize) || 100));
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
export const updateFinalProfileHandler = wrap((req) => customersService.updateFinalProfile(asString(req.params.id), req.body, req.user!.id));
export const setAccountConfigModeHandler = wrap((req) => customersService.setAccountConfigMode(asString(req.params.id), req.body.mode, req.user!.id));
export const submitFinalOnboardingRegularHandler = wrap((req) => customersService.submitFinalOnboardingRegular(asString(req.params.id), req.user!.id));

export const requestFieldChangeHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const request = await customersService.requestFieldChange(
      asString(req.params.id),
      req.body.fieldKey,
      req.body.newValue,
      req.body.reason,
      req.body.documentType,
      req.user!.id
    );
    return sendSuccess(res, { request }, 201);
  } catch (err: any) {
    if (err?.statusCode) return sendError(res, err.statusCode, err.code, err.message);
    next(err);
  }
};

export const requestDocumentChangeHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = (req as any).file;
    if (!file) return sendError(res, 400, 'MISSING_FILE', 'No file uploaded');
    const documentType = asOptionalString(req.body?.documentType);
    if (!documentType) return sendError(res, 400, 'MISSING_DOCUMENT_TYPE', 'Document type is required');
    const reason = asOptionalString(req.body?.reason);
    const request = await customersService.requestDocumentChange(
      asString(req.params.id),
      documentType,
      reason,
      file.buffer,
      file.originalname,
      req.user!.id
    );
    return sendSuccess(res, { request }, 201);
  } catch (err: any) {
    if (err?.statusCode) return sendError(res, err.statusCode, err.code, err.message);
    next(err);
  }
};

export const getEditableFieldDefsHandler = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    return sendSuccess(res, { fields: customersService.getEditableFieldDefs() });
  } catch (err) {
    next(err);
  }
};

export const listFieldChangeRequestsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await customersService.listFieldChangeRequests(asString(req.params.id));
    return sendSuccess(res, { items });
  } catch (err) {
    next(err);
  }
};

export const decideFieldChangeRequestHandler = wrap((req) => customersService.decideFieldChangeRequest(asString(req.params.requestId), req.body.approve, req.user!.id));
export const directFieldEditHandler = wrap((req) => customersService.directFieldEdit(asString(req.params.id), req.body.fieldKey, req.body.newValue, req.user!.id));

export const listFollowUpsHandler = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await customersService.deriveFollowUps();
    return sendSuccess(res, { items });
  } catch (err) {
    next(err);
  }
};