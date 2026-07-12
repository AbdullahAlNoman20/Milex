// src/modules/onboarding/onboarding.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as onboardingService from './onboarding.service';
import { sendSuccess, sendError } from '../../common/utils/apiResponse.util';

export const uploadDocumentHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const files = (req as any).files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) return sendError(res, 400, 'MISSING_FILE', 'No file uploaded');

    const documentType = typeof req.body?.documentType === 'string' ? req.body.documentType.trim() : '';
    if (!documentType) return sendError(res, 400, 'MISSING_DOCUMENT_TYPE', 'Document type is required');

    const documents = [];
    for (const file of files) {
      const doc = await onboardingService.uploadOnboardingDocument(
        req.params.id,
        file.buffer,
        file.originalname,
        documentType,
        req.user!.id
      );
      documents.push(doc);
    }
    return sendSuccess(res, { documents }, 201);
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
  } catch (err) {
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
  } catch (err) {
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
  } catch (err) {
    next(err);
  }
};