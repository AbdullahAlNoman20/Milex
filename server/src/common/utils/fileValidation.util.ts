// server/src/common/utils/fileValidation.util.ts
import { fromBuffer } from 'file-type';

const BLOCKED_EXTENSIONS = ['.php', '.js', '.exe', '.sh', '.bat', '.cmd', '.com', '.msi', '.dll', '.jar', '.apk', '.vbs', '.ps1', '.html', '.htm', '.svg'];
const BLOCKED_MIME_TYPES = [
  'application/x-msdownload',
  'application/x-sh',
  'application/x-executable',
  'application/x-elf',
  'application/vnd.microsoft.portable-executable',
  'application/java-archive',
  'text/x-shellscript',
];
// Allowlist of genuine business-document types this system actually accepts
// (matches what the onboarding/edit-request UIs upload). Anything outside
// this set is rejected even if not on the blacklist above.
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
]);
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export const isExtensionBlocked = (fileName: string): boolean => {
  const lower = fileName.toLowerCase();
  return BLOCKED_EXTENSIONS.some((ext) => lower.endsWith(ext));
};

// Business documents of any type (PDF, images, Office docs, etc.) are
// accepted. Only executables/scripts are blocked — by extension AND by
// detected magic bytes, so a renamed .exe can't slip through as "report.pdf".
export const validateUploadedFile = async (
  buffer: Buffer,
  originalName: string
): Promise<{ valid: boolean; reason?: string; detectedMime?: string }> => {
  if (buffer.length === 0 || buffer.length > MAX_FILE_SIZE_BYTES) {
    return { valid: false, reason: 'File size out of allowed range (max 10MB)' };
  }
  if (isExtensionBlocked(originalName)) {
    return { valid: false, reason: 'This file type is not allowed' };
  }
  const detected = await fromBuffer(buffer);
  if (detected && BLOCKED_MIME_TYPES.includes(detected.mime)) {
    return { valid: false, reason: 'This file type is not allowed' };
  }
  if (detected && !ALLOWED_MIME_TYPES.has(detected.mime)) {
    return { valid: false, reason: 'This file type is not allowed' };
  }
  return { valid: true, detectedMime: detected?.mime || 'application/octet-stream' };
};