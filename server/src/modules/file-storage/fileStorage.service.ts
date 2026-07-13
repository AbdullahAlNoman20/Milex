// server/src/modules/file-storage/fileStorage.service.ts 
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../../config/env';
import { validateUploadedFile } from '../../common/utils/fileValidation.util';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Files renamed on upload: UUID-based key, original name kept in DB only.
export const uploadFileToSupabase = async (buffer: Buffer, originalName: string) => {
  const validation = await validateUploadedFile(buffer, originalName);
  if (!validation.valid) {
    throw { statusCode: 400, code: 'INVALID_FILE', message: validation.reason };
  }

  const ext = originalName.includes('.') ? originalName.slice(originalName.lastIndexOf('.')) : '';
  const key = `${uuidv4()}-${Date.now()}${ext}`;

  const { error } = await supabase.storage.from(env.SUPABASE_BUCKET).upload(key, buffer, {
    contentType: validation.detectedMime,
    upsert: false,
  });

  if (error) {
    throw { statusCode: 502, code: 'UPLOAD_FAILED', message: 'File upload failed, please try again' };
  }

  return { storageKey: key, mimeType: validation.detectedMime!, sizeBytes: buffer.length };
};

// Access via signed expiring URLs only — bucket stays private, never a public permanent link.
export const getSignedDownloadUrl = async (storageKey: string, expiresInSeconds = 300) => {
  const { data, error } = await supabase.storage
    .from(env.SUPABASE_BUCKET)
    .createSignedUrl(storageKey, expiresInSeconds);

  if (error || !data) {
    throw { statusCode: 502, code: 'SIGN_FAILED', message: 'Could not generate a download link' };
  }
  return data.signedUrl;
};