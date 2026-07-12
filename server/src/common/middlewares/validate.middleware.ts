// src/common/middlewares/validate.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { sendError } from '../utils/apiResponse.util';

export const validateBody = (schema: AnyZodObject) => (req: Request, res: Response, next: NextFunction) => {
  try {
    // .strict() enforced within each schema definition — unknown/malformed fields rejected.
    req.body = schema.parse(req.body);
    next();
  } catch (err) {
    if (err instanceof ZodError) {
      return sendError(res, 400, 'VALIDATION_ERROR', err.issues.map((e) => e.message).join('; '));
    }
    next(err);
  }
};

export const validateQuery = (schema: AnyZodObject) => (req: Request, res: Response, next: NextFunction) => {
  try {
    req.query = schema.parse(req.query) as any;
    next();
  } catch (err) {
    if (err instanceof ZodError) {
      return sendError(res, 400, 'VALIDATION_ERROR', err.issues.map((e) => e.message).join('; '));
    }
    next(err);
  }
}; 