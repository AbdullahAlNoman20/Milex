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

// Office formats are containers, so magic bytes only prove "this is a zip"
// or "this is a compound file" — the extension is what says which Office
// document it is. Both have to agree before the file is accepted.
const CONTAINER_MIME_EXTENSIONS: Record<string, string[]> = {
  'application/zip': ['.docx', '.xlsx'],
  'application/x-cfb': ['.doc', '.xls'],
};
const CONTAINER_RESOLVED_MIME: Record<string, string> = {
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.doc': 'application/msword',
  '.xls': 'application/vnd.ms-excel',
};

// Plain-text formats carry no magic bytes at all, so `file-type` returns
// nothing for them. Previously that meant the allowlist was skipped entirely
// and ANY unrecognised file was accepted — including a renamed binary.
const TEXT_FALLBACK_MIME: Record<string, string> = {
  '.txt': 'text/plain',
  '.csv': 'text/csv',
};

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const REJECT_REASON = 'This type of file isn\'t allowed. Please upload a PDF, image, Word, Excel, CSV or text file.';

const extensionOf = (fileName: string): string => {
  const lower = fileName.toLowerCase();
  const dot = lower.lastIndexOf('.');
  return dot === -1 ? '' : lower.slice(dot);
};

export const isExtensionBlocked = (fileName: string): boolean => {
  const lower = fileName.toLowerCase();
  return BLOCKED_EXTENSIONS.some((ext) => lower.endsWith(ext));
};

export const validateUploadedFile = async (
  buffer: Buffer,
  originalName: string
): Promise<{ valid: boolean; reason?: string; detectedMime?: string }> => {
  if (buffer.length === 0) {
    return { valid: false, reason: 'This file appears to be empty. Please choose a different file.' };
  }
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    return { valid: false, reason: 'This file is too large. Please upload a file smaller than 10MB.' };
  }
  if (isExtensionBlocked(originalName)) {
    return { valid: false, reason: REJECT_REASON };
  }

  const ext = extensionOf(originalName);
  const detected = await fromBuffer(buffer);

  if (!detected) {
    // No magic bytes: only genuine plain-text formats are allowed through,
    // and only if the content really is text (a NUL byte means binary).
    const fallback = TEXT_FALLBACK_MIME[ext];
    if (!fallback) return { valid: false, reason: REJECT_REASON };
    if (buffer.includes(0)) return { valid: false, reason: REJECT_REASON };
    return { valid: true, detectedMime: fallback };
  }

  if (BLOCKED_MIME_TYPES.includes(detected.mime)) {
    return { valid: false, reason: REJECT_REASON };
  }

  const allowedExtsForContainer = CONTAINER_MIME_EXTENSIONS[detected.mime];
  if (allowedExtsForContainer) {
    if (!allowedExtsForContainer.includes(ext)) return { valid: false, reason: REJECT_REASON };
    return { valid: true, detectedMime: CONTAINER_RESOLVED_MIME[ext] };
  }

  if (!ALLOWED_MIME_TYPES.has(detected.mime)) {
    return { valid: false, reason: REJECT_REASON };
  }
  return { valid: true, detectedMime: detected.mime };
};