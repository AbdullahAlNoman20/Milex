// server/src/modules/file-storage/fileStorage.controller.ts (FULL REPLACEMENT — adds download handler)
import { Request, Response, NextFunction } from "express";
import * as fileStorageService from "./fileStorage.service";
import { sendSuccess, sendError } from "../../common/utils/apiResponse.util";
import { asOptionalString } from "../../common/utils/requestParams.util";
import { assertUserCanAccessStorageKey } from "./fileStorage.access";

export const getSignedUrlHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const storageKey = asOptionalString(req.params.key);
    if (!storageKey)
      return sendError(res, 400, "MISSING_KEY", "Storage key required");
    await assertUserCanAccessStorageKey(storageKey, {
      id: req.user!.id,
      role: req.user!.role,
    });
    const url = await fileStorageService.getSignedDownloadUrl(storageKey);
    return sendSuccess(res, { url });
  } catch (err: any) {
    if (err?.statusCode)
      return sendError(res, err.statusCode, err.code, err.message);
    next(err);
  }
};

// Defense-in-depth: even though the URL is HMAC-signed + short-lived,
// re-check ownership at fetch time in case a signed link leaks/gets shared
// before it expires.
export const downloadHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const storageKey = asOptionalString(req.params.key);
    const exp = asOptionalString(req.query.exp);
    const sig = asOptionalString(req.query.sig);
    if (!storageKey || !exp || !sig) {
      return sendError(res, 400, "MISSING_PARAMS", "Invalid download link");
    }
    if (!fileStorageService.verifyDownloadSignature(storageKey, exp, sig)) {
      return sendError(res, 403, "LINK_EXPIRED", "This link has expired");
    }
    await assertUserCanAccessStorageKey(storageKey, {
      id: req.user!.id,
      role: req.user!.role,
    });
    const fullPath = fileStorageService.streamFile(storageKey);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.sendFile(fullPath, (err) => {
      if (err) next(err);
    });
  } catch (err: any) {
    if (err?.statusCode)
      return sendError(res, err.statusCode, err.code, err.message);
    next(err);
  }
};