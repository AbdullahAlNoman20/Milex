// src/common/utils/encryption.util.ts
import crypto from 'crypto';
import { env } from '../../config/env';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

const getKeyBuffer = (): Buffer => {
  const key = Buffer.from(env.FIELD_ENCRYPTION_KEY, 'hex');
  if (key.length !== 32) {
    throw new Error('FIELD_ENCRYPTION_KEY must be a 32-byte hex string');
  }
  return key;
};

export const encryptField = (plainText: string): string => {
  const key = getKeyBuffer();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
};

export const decryptField = (payload: string): string => {
  const key = getKeyBuffer();
  const buffer = Buffer.from(payload, 'base64');
  const iv = buffer.subarray(0, IV_LENGTH);
  const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + 16);
  const encrypted = buffer.subarray(IV_LENGTH + 16);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
};