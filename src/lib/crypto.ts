/**
 * AES-256-GCM encryption helpers for TemporaryPostLog.
 *
 * Key: 32-byte hex string from process.env.LOG_ENCRYPTION_KEY
 * Format: "<iv_hex>:<ciphertext_base64>:<tag_hex>"
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12; // 96-bit IV recommended for GCM

function getKey(): Buffer {
  const hex = process.env.LOG_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      'LOG_ENCRYPTION_KEY must be a 32-byte hex string (64 hex chars). ' +
      'Generate with: openssl rand -hex 32'
    );
  }
  return Buffer.from(hex, 'hex');
}

/**
 * Encrypts plaintext with AES-256-GCM.
 * Returns "<iv_hex>:<ciphertext_base64>:<tag_hex>"
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${encrypted.toString('base64')}:${tag.toString('hex')}`;
}

/**
 * Decrypts a value produced by `encrypt`.
 * Throws on authentication failure or malformed input.
 */
export function decrypt(ciphertext: string): string {
  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid ciphertext format');
  }
  const [ivHex, encBase64, tagHex] = parts as [string, string, string];

  const key = getKey();
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encBase64, 'base64');
  const tag = Buffer.from(tagHex, 'hex');

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return decipher.update(encrypted, undefined, 'utf8') + decipher.final('utf8');
}

/**
 * Returns a SHA-256 hex hash of a string (e.g. media URL).
 * Used for privacy-preserving logging — we store the hash, not the URL.
 */
export function sha256Hash(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}
