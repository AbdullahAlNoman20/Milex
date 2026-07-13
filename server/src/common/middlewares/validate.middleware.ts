// server/src/common/middlewares/validate.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { ZodType, ZodError } from 'zod';
import { sendError } from '../utils/apiResponse.util';

export const validateBody = (schema: ZodType) => (req: Request, res: Response, next: NextFunction) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (err) {
    if (err instanceof ZodError) {
      return sendError(res, 400, 'VALIDATION_ERROR', err.issues.map((e) => e.message).join('; '));
    }
    next(err);
  }
};

export const validateQuery = (schema: ZodType) => (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = schema.parse(req.query);
    Object.defineProperty(req, 'query', { value: parsed, writable: true, configurable: true });
    next();
  } catch (err) {
    if (err instanceof ZodError) {
      return sendError(res, 400, 'VALIDATION_ERROR', err.issues.map((e) => e.message).join('; '));
    }
    next(err);
  }
};