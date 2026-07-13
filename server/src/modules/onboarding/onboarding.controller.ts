// server/src/modules/onboarding/onboarding.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as onboardingService from './onboarding.service';
import { sendSuccess, sendError } from '../../common/utils/apiResponse.util';
import { asString, asOptionalString } from '../../common/utils/requestParams.util';

export const uploadDocumentHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) return sendError(res, 400, 'MISSING_FILE', 'No file uploaded');

    const documentType = asOptionalString(req.body?.documentType);
    if (!documentType) return sendError(res, 400, 'MISSING_DOCUMENT_TYPE', 'Document type is required');

    const documentNumber = asOptionalString(req.body?.documentNumber);
    const expiryDate = asOptionalString(req.body?.expiryDate);

    const doc = await onboardingService.uploadOnboardingDocument(
      asString(req.params.id),
      file.buffer,
      file.originalname,
      documentType,
      documentNumber,
      expiryDate,
      req.user!.id
    );
    return sendSuccess(res, { document: doc }, 201);
  } catch (err: any) {
    if (err?.statusCode) return sendError(res, err.statusCode, err.code, err.message);
    next(err);
  }
};

export const requestExtensionHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const request = await onboardingService.requestTimeExtension(
      asString(req.params.id),
      req.body.requestedDays,
      req.body.reason,
      req.user!.id
    );
    return sendSuccess(res, { request }, 201);
  } catch (err: any) {
    if (err?.statusCode) return sendError(res, err.statusCode, err.code, err.message);
    next(err);
  }
};

export const decideExtensionHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customer = await onboardingService.decideTimeExtension(
      asString(req.params.requestId),
      req.body.approve,
      req.body.grantedDays,
      req.user!.id
    );
    return sendSuccess(res, { customer });
  } catch (err: any) {
    if (err?.statusCode) return sendError(res, err.statusCode, err.code, err.message);
    next(err);
  }
};

export const submitFinalOnboardingHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customer = await onboardingService.submitFinalOnboardingRequest(asString(req.params.id), req.user!.id);
    return sendSuccess(res, { customer });
  } catch (err: any) {
    if (err?.statusCode) return sendError(res, err.statusCode, err.code, err.message);
    next(err);
  }
};

export const decideFinalOnboardingHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customer = await onboardingService.decideFinalOnboarding(
      asString(req.params.id),
      req.body.approve,
      req.body.comments,
      req.user!.id
    );
    return sendSuccess(res, { customer });
  } catch (err: any) {
    if (err?.statusCode) return sendError(res, err.statusCode, err.code, err.message);
    next(err);
  }
};