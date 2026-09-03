// server/src/modules/daily-reports/dailyReports.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as dailyReportsService from './dailyReports.service';
import { sendSuccess, sendError } from '../../common/utils/apiResponse.util';
import { asString } from '../../common/utils/requestParams.util';
import { assertLineManagerOwnsKam } from '../../common/utils/scopeGuard.util';

export const getByDateHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const report = await dailyReportsService.getReportByDate(req.user!.id, asString(req.params.date));
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
    const kamId = asString(req.params.kamId);
    if (req.user!.role === 'LINE_MANAGER') {
      await assertLineManagerOwnsKam(kamId, req.user!.id);
    }
    const reports = await dailyReportsService.listReportsForKam(kamId);
    return sendSuccess(res, { reports });
  } catch (err: any) {
    if (err?.statusCode) return sendError(res, err.statusCode, err.code, err.message);
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