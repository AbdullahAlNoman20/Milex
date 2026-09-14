// server/src/modules/backup/backup.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as backupService from './backup.service';
import { sendSuccess, sendError } from '../../common/utils/apiResponse.util';

export const statsHandler = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    return sendSuccess(res, await backupService.getStorageStats());
  } catch (err) {
    next(err);
  }
};

export const downloadBackupHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const includeFiles = String(req.query.includeFiles ?? 'true') !== 'false';
    const backup = await backupService.createBackup(includeFiles, req.user!.id);
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="milex-backup-${stamp}.json"`);
    return res.status(200).send(JSON.stringify(backup));
  } catch (err: any) {
    if (err?.statusCode) return sendError(res, err.statusCode, err.code, err.message);
    next(err);
  }
};

export const restoreHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await backupService.restoreBackup(req.body?.backup, req.body?.confirm, req.user!.id);
    return sendSuccess(res, result);
  } catch (err: any) {
    if (err?.statusCode) return sendError(res, err.statusCode, err.code, err.message);
    next(err);
  }
};