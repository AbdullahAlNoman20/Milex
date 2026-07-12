// src/common/utils/apiResponse.util.ts
import { Response } from 'express';

export const sendSuccess = <T>(res: Response, data: T, statusCode = 200) => {
  return res.status(statusCode).json({ success: true, data });
};

export const sendError = (
  res: Response,
  statusCode: number,
  code: string,
  message: string
) => {
  return res.status(statusCode).json({ success: false, error: { code, message } });
};