// src/common/utils/hash.util.ts
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const BCRYPT_COST_FACTOR = 12;

export const hashPassword = (plain: string): Promise<string> => bcrypt.hash(plain, BCRYPT_COST_FACTOR);

export const verifyPassword = (plain: string, hash: string): Promise<boolean> => bcrypt.compare(plain, hash);

// For opaque tokens (refresh tokens, reset tokens) — store only the hash, never the raw value.
export const hashOpaqueToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

export const generateOpaqueToken = (): string => crypto.randomBytes(48).toString('hex');

const PASSWORD_POLICY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export const isPasswordPolicyCompliant = (plain: string): boolean =>
  typeof plain === 'string' && PASSWORD_POLICY.test(plain);

// Shown directly to users (in a toast) whenever a password doesn't meet the
// policy — kept in one place so the wording stays consistent everywhere.
export const PASSWORD_POLICY_MESSAGE =
  'Your password needs to be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character (like ! or @).';

export const isPasswordReused = async (plain: string, history: string[]): Promise<boolean> => {
  for (const oldHash of history) {
    if (await bcrypt.compare(plain, oldHash)) return true;
  }
  return false;
};