// server/src/modules/file-storage/fileStorage.controller.ts
import { Request, Response, NextFunction } from "express";
import * as fileStorageService from "./fileStorage.service";
import { sendSuccess, sendError } from "../../common/utils/apiResponse.util";
import { asOptionalString } from "../../common/utils/requestParams.util";
import { assertUserCanAccessStorageKey } from "./fileStorage.access";

// Only these render safely in a browser tab. Everything else is handed over
// as a download rather than being opened in a document context.
const INLINE_SAFE_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "text/plain",
]);

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
    const meta = await assertUserCanAccessStorageKey(storageKey, {
      id: req.user!.id,
      role: req.user!.role,
    });

    const mimeType = meta.mimeType || "application/octet-stream";
    const disposition = INLINE_SAFE_MIME.has(mimeType) ? "inline" : "attachment";
    const safeName = (meta.originalName || storageKey).replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);

    const fullPath = fileStorageService.streamFile(storageKey);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Type", mimeType);
    // Nothing served from here may ever execute or load anything else.
    res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
    res.setHeader("Content-Disposition", `${disposition}; filename="${safeName}"`);
    res.sendFile(fullPath, (err) => {
      if (err) next(err);
    });
  } catch (err: any) {
    if (err?.statusCode)
      return sendError(res, err.statusCode, err.code, err.message);
    next(err);
  }
};