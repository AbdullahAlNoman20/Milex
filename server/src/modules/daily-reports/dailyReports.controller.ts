// src/modules/daily-reports/dailyReports.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as dailyReportsService from './dailyReports.service';
import { sendSuccess } from '../../common/utils/apiResponse.util';

export const getByDateHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const report = await dailyReportsService.getReportByDate(req.user!.id, req.params.date);
    return sendSuccess(res, { report });
  } catch (err) {
    next(err);
  }
};

export const upsertReportHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const report = await dailyReportsService.upsertReport(req.user!.id, req.body);
    return sendSuccess(res, { report });
  } catch (err) {
    next(err);
  }
};

export const listForKamHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reports = await dailyReportsService.listReportsForKam(req.params.kamId);
    return sendSuccess(res, { reports });
  } catch (err) {
    next(err);
  }
};

export const listMineHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reports = await dailyReportsService.listReportsForKam(req.user!.id);
    return sendSuccess(res, { reports });
  } catch (err) {
    next(err);
  }
};