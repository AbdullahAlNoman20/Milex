// src/common/middlewares/errorHandler.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { Logger } from 'pino';
import { sendError } from '../utils/apiResponse.util';
import { InvalidTransitionError } from '../utils/stateMachine.util';
import { env } from '../../config/env';

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
    const issues = (err as any).issues?.map((i: any) => i.message).join('; ') || 'Request validation failed';
    return sendError(res, 400, 'VALIDATION_ERROR', issues);
  }
  const message = env.IS_PRODUCTION ? 'An unexpected error occurred' : String((err as Error)?.message || err);
  return sendError(res, 500, 'INTERNAL_ERROR', message);
};

export const notFoundMiddleware = (req: Request, res: Response) => {
  return sendError(res, 404, 'NOT_FOUND', `Route ${req.method} ${req.path} not found`);
};