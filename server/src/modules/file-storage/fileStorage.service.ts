// src/modules/file-storage/fileStorage.service.ts
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../../config/env';
import { validateUploadedFile } from '../../common/utils/fileValidation.util';

const s3 = new S3Client({
  endpoint: env.R2_ENDPOINT,
  region: 'auto',
  credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
});

// Files renamed on upload: UUID-based key, original name kept as metadata only.
export const uploadFileToR2 = async (buffer: Buffer, originalName: string) => {
  const validation = await validateUploadedFile(buffer, originalName);
  if (!validation.valid) {
    throw { statusCode: 400, code: 'INVALID_FILE', message: validation.reason };
  }

  const key = `${uuidv4()}-${Date.now()}`;
  await s3.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: validation.detectedMime,
      Metadata: { originalName: encodeURIComponent(originalName) },
    })
  );

  return { storageKey: key, mimeType: validation.detectedMime!, sizeBytes: buffer.length };
};

// Access via signed expiring URLs only — never a public permanent link.
export const getSignedDownloadUrl = async (storageKey: string, expiresInSeconds = 300) => {
  const command = new GetObjectCommand({ Bucket: env.R2_BUCKET, Key: storageKey });
  return getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
};