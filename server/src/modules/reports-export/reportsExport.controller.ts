// src/modules/reports-export/reportsExport.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as reportsExportService from './reportsExport.service';
import { sendSuccess } from '../../common/utils/apiResponse.util';

export const requestExportHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reportType, filters } = req.body;
    const result = await reportsExportService.requestExport(reportType, filters || {}, req.user!.id);
    return sendSuccess(res, result, 200);
  } catch (err) {
    next(err);
  }
};