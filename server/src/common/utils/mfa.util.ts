// src/common/utils/mfa.util.ts
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

export const generateMfaSecret = (label: string) =>
  speakeasy.generateSecret({ name: `Milex (${label})`, length: 20 });

export const buildQrCodeDataUrl = async (otpauthUrl: string): Promise<string> => QRCode.toDataURL(otpauthUrl);

export const verifyMfaToken = (secretBase32: string, token: string): boolean =>
  speakeasy.totp.verify({ secret: secretBase32, encoding: 'base32', token, window: 1 }); 