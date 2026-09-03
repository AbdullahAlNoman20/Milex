// server/src/common/middlewares/validate.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { ZodType, ZodError } from 'zod';
import { sendError } from '../utils/apiResponse.util';
import { humanizeZodMessage } from '../utils/errorMessages.util';

// Only the FIRST issue is shown — a non-technical person reading a wall of
// semicolon-joined validation errors can't tell which one actually matters
// or what to fix first. One clear sentence is easier to act on.
const buildFriendlyValidationMessage = (err: ZodError): string => {
  const first = err.issues[0];
  if (!first) return 'Some of the information you entered doesn\'t look right. Please review and try again.';
  const path = first.path.filter((p): p is string | number => typeof p === 'string' || typeof p === 'number');
  return humanizeZodMessage(first.message, path);
};

export const validateBody = (schema: ZodType) => (req: Request, res: Response, next: NextFunction) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (err) {
    if (err instanceof ZodError) {
      return sendError(res, 400, 'VALIDATION_ERROR', buildFriendlyValidationMessage(err));
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
      return sendError(res, 400, 'VALIDATION_ERROR', buildFriendlyValidationMessage(err));
    }
    next(err);
  }
};