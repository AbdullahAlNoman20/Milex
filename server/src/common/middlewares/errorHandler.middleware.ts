// src/common/middlewares/errorHandler.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { Logger } from 'pino';
import { sendError } from '../utils/apiResponse.util';
import { InvalidTransitionError } from '../utils/stateMachine.util';
import { env } from '../../config/env';
import { FRIENDLY_MESSAGES, humanizeZodMessage } from '../utils/errorMessages.util';

// Prisma error codes we specifically translate into plain language. Anything
// else falls through to the generic message — we never show a raw Prisma
// error code or SQL detail to the person using the app.
const PRISMA_NOT_FOUND = 'P2025';
const PRISMA_UNIQUE_VIOLATION = 'P2002';
const PRISMA_FOREIGN_KEY_VIOLATION = 'P2003';

export const errorHandlerMiddleware = (logger: Logger) => (
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) => {
  logger.error({ err, path: req.path }, 'Unhandled error');

  if (err instanceof InvalidTransitionError) {
    return sendError(res, 409, 'INVALID_STATE_TRANSITION', err.message);
  }

  if (err && typeof err === 'object' && 'name' in err && (err as any).name === 'ZodError') {
    const first = (err as any).issues?.[0];
    const message = first ? humanizeZodMessage(first.message, first.path) : FRIENDLY_MESSAGES.GENERIC_VALIDATION;
    return sendError(res, 400, 'VALIDATION_ERROR', message);
  }

  // Prisma known-error codes — translate instead of leaking DB internals.
  const prismaCode = err && typeof err === 'object' ? (err as any).code : undefined;
  if (prismaCode === PRISMA_NOT_FOUND) {
    return sendError(res, 404, 'NOT_FOUND', FRIENDLY_MESSAGES.RECORD_NOT_FOUND);
  }
  if (prismaCode === PRISMA_UNIQUE_VIOLATION) {
    return sendError(res, 409, 'DUPLICATE_RECORD', FRIENDLY_MESSAGES.DUPLICATE_RECORD);
  }
  if (prismaCode === PRISMA_FOREIGN_KEY_VIOLATION) {
    return sendError(res, 409, 'RELATED_RECORD_ISSUE', 'This action can\'t be completed because it\'s linked to other records. Please refresh and try again.');
  }

  const message = env.IS_PRODUCTION ? FRIENDLY_MESSAGES.GENERIC_SERVER_ERROR : String((err as Error)?.message || err);
  return sendError(res, 500, 'INTERNAL_ERROR', message);
};

export const notFoundMiddleware = (req: Request, res: Response) => {
  return sendError(res, 404, 'NOT_FOUND', 'The page or resource you\'re looking for doesn\'t exist.');
};