// server/src/modules/file-storage/fileStorage.controller.ts 
import { Request, Response, NextFunction } from 'express';
import * as fileStorageService from './fileStorage.service';
import { sendSuccess, sendError } from '../../common/utils/apiResponse.util';
import { asOptionalString } from '../../common/utils/requestParams.util';

export const getSignedUrlHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storageKey = asOptionalString(req.params.key);
    if (!storageKey) return sendError(res, 400, 'MISSING_KEY', 'Storage key required');
    const url = await fileStorageService.getSignedDownloadUrl(storageKey);
    return sendSuccess(res, { url });
  } catch (err) {
    next(err);
  }
};