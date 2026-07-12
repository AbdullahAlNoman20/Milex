// src/common/middlewares/upload.middleware.ts
import multer from 'multer';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

// Buffered in memory only long enough to run magic-byte validation + push to
// R2 — never written to the server's local/public filesystem.
export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 5 },
});