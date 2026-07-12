// src/common/utils/fileValidation.util.ts
import { fileTypeFromBuffer } from 'file-type';

const BLOCKED_EXTENSIONS = ['.php', '.js', '.exe', '.sh', '.bat', '.cmd', '.com', '.msi', '.dll'];
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export const isExtensionBlocked = (fileName: string): boolean => {
  const lower = fileName.toLowerCase();
  return BLOCKED_EXTENSIONS.some((ext) => lower.endsWith(ext));
};

export const validateUploadedFile = async (
  buffer: Buffer,
  originalName: string
): Promise<{ valid: boolean; reason?: string; detectedMime?: string }> => {
  if (buffer.length === 0 || buffer.length > MAX_FILE_SIZE_BYTES) {
    return { valid: false, reason: 'File size out of allowed range' };
  }
  if (isExtensionBlocked(originalName)) {
    return { valid: false, reason: 'File extension is not allowed' };
  }
  const detected = await fileTypeFromBuffer(buffer);
  if (!detected || !ALLOWED_MIME_TYPES.includes(detected.mime)) {
    return { valid: false, reason: 'File content does not match an allowed type (magic-byte check failed)' };
  }
  return { valid: true, detectedMime: detected.mime };
};