// src/modules/reports-export/reportsExport.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as reportsExportService from './reportsExport.service';
import { sendSuccess, sendError } from '../../common/utils/apiResponse.util';

export const requestExportHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reportType, filters } = req.body;
    const result = await reportsExportService.requestExport(reportType, filters || {}, {
      id: req.user!.id,
      role: req.user!.role,
    });
    return sendSuccess(res, result, 200);
  } catch (err: any) {
    if (err?.statusCode) return sendError(res, err.statusCode, err.code, err.message);
    next(err);
  }
};