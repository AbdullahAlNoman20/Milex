// server/src/modules/onboarding/onboarding.controller.ts 
import { Request, Response, NextFunction } from 'express';
import * as onboardingService from './onboarding.service';
import { sendSuccess, sendError } from '../../common/utils/apiResponse.util';

const asString = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  return undefined;
};

export const uploadDocumentHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) return sendError(res, 400, 'MISSING_FILE', 'No file uploaded');

    const documentType = asString(req.body?.documentType);
    if (!documentType) return sendError(res, 400, 'MISSING_DOCUMENT_TYPE', 'Document type is required');

    const documentNumber = asString(req.body?.documentNumber);
    const expiryDate = asString(req.body?.expiryDate);

    const doc = await onboardingService.uploadOnboardingDocument(
      req.params.id,
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
      req.params.id,
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
      req.params.requestId,
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
    const customer = await onboardingService.submitFinalOnboardingRequest(req.params.id, req.user!.id);
    return sendSuccess(res, { customer });
  } catch (err: any) {
    if (err?.statusCode) return sendError(res, err.statusCode, err.code, err.message);
    next(err);
  }
};

export const decideFinalOnboardingHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customer = await onboardingService.decideFinalOnboarding(
      req.params.id,
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