/**
 * @file encryption.ts
 * @description AES-256-GCM encryption for two-factor authentication secrets.
 *              Provides symmetric encryption for storing TOTP secrets securely in the database.
 * @module two-factor
 *
 * @security Uses AES-256-GCM authenticated encryption.
 *           Encryption key must be set via TWO_FACTOR_ENCRYPTION_KEY environment variable
 *           in production. In development, derives from NEXTAUTH_SECRET.
 *
 * @example
 * // Encrypt a TOTP secret before storing
 * const encrypted = encrypt(totpSecret);
 * await db.user.update({ data: { twoFactorSecret: encrypted } });
 *
 * // Decrypt when verifying
 * const decrypted = decrypt(user.twoFactorSecret);
 */

import crypto from 'crypto';
import logger from '@/lib/core/log';

/** Encryption algorithm: AES-256-GCM (authenticated encryption) */
const ALGORITHM = 'aes-256-gcm';

/** Initialization vector length in bytes */
const IV_LENGTH = 16;

/** GCM authentication tag length in bytes */
const AUTH_TAG_LENGTH = 16;

/** Expected encryption key length in hex characters (32 bytes = 64 hex chars) */
const KEY_LENGTH_HEX = 64;

/** Salt for deriving development key from NEXTAUTH_SECRET */
const DEV_KEY_SALT = 'durj-2fa-encryption';

/**
 * Retrieves or derives the encryption key from environment variables.
 *
 * @returns 32-byte encryption key as Buffer
 * @throws Error if encryption key is missing in production or NEXTAUTH_SECRET is missing
 *
 * @security In production, TWO_FACTOR_ENCRYPTION_KEY must be set.
 *           In development, key is derived from NEXTAUTH_SECRET using scrypt.
 */
function getEncryptionKey(): Buffer {
  const key = process.env.TWO_FACTOR_ENCRYPTION_KEY;

  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'CRITICAL: TWO_FACTOR_ENCRYPTION_KEY is required in production. ' +
        'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
      );
    }

    if (!process.env.NEXTAUTH_SECRET) {
      throw new Error('CRITICAL: NEXTAUTH_SECRET environment variable is required');
    }

    logger.warn(
      'TWO_FACTOR_ENCRYPTION_KEY not set - using derived key from NEXTAUTH_SECRET. ' +
      'Set TWO_FACTOR_ENCRYPTION_KEY in production for better security.'
    );

    const salt = crypto.createHash('sha256').update(DEV_KEY_SALT).digest();
    return crypto.scryptSync(process.env.NEXTAUTH_SECRET, salt, 32);
  }

  if (key.length !== KEY_LENGTH_HEX) {
    throw new Error(`TWO_FACTOR_ENCRYPTION_KEY must be ${KEY_LENGTH_HEX} hex characters (32 bytes)`);
  }

  return Buffer.from(key, 'hex');
}

/**
 * Encrypts a string value using AES-256-GCM.
 *
 * @param text - Plain text to encrypt
 * @returns Encrypted string (hex encoded: IV + AuthTag + Ciphertext)
 *
 * @example
 * const encrypted = encrypt('JBSWY3DPEHPK3PXP');
 * // Returns: "1234567890abcdef..." (hex string)
 *
 * @security Uses random IV for each encryption to ensure unique ciphertexts.
 *           GCM mode provides authentication to detect tampering.
 */
export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return iv.toString('hex') + authTag.toString('hex') + encrypted;
}

/**
 * Decrypts a string value encrypted with encrypt().
 *
 * @param encryptedText - Encrypted string (hex encoded: IV + AuthTag + Ciphertext)
 * @returns Decrypted plain text
 * @throws Error if decryption fails (wrong key, corrupted data, or tampering detected)
 *
 * @example
 * const decrypted = decrypt(user.twoFactorSecret);
 * // Returns: "JBSWY3DPEHPK3PXP"
 *
 * @security GCM mode verifies the authentication tag, throwing an error if
 *           the ciphertext has been tampered with.
 */
export function decrypt(encryptedText: string): string {
  const key = getEncryptionKey();

  const iv = Buffer.from(encryptedText.slice(0, IV_LENGTH * 2), 'hex');
  const authTag = Buffer.from(
    encryptedText.slice(IV_LENGTH * 2, (IV_LENGTH + AUTH_TAG_LENGTH) * 2),
    'hex'
  );
  const encrypted = encryptedText.slice((IV_LENGTH + AUTH_TAG_LENGTH) * 2);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Generates a random 256-bit encryption key for initial setup.
 *
 * @returns 64-character hex string suitable for TWO_FACTOR_ENCRYPTION_KEY
 *
 * @example
 * // Generate a new encryption key for production setup
 * const key = generateEncryptionKey();
 * console.log(`TWO_FACTOR_ENCRYPTION_KEY=${key}`);
 *
 * @remarks Use this or the equivalent Node.js command:
 *          node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/*
 * ========== CODE REVIEW SUMMARY ==========
 * File: encryption.ts
 * Reviewed: 2025-01-29
 *
 * CHANGES MADE:
 * - Replaced console.warn with logger.warn for proper logging
 * - Added comprehensive JSDoc with @param, @returns, @throws, @security, @example
 * - Extracted magic numbers to named constants (KEY_LENGTH_HEX, DEV_KEY_SALT)
 * - Added file-level @example for common usage patterns
 * - Improved error messages with actionable guidance
 *
 * SECURITY NOTES:
 * - Uses AES-256-GCM authenticated encryption
 * - Random IV per encryption prevents pattern analysis
 * - GCM authentication tag detects tampering
 * - Production requires dedicated encryption key
 * - Development key is derived using scrypt with unique salt
 *
 * REMAINING CONCERNS:
 * - None
 *
 * REQUIRED TESTS:
 * - [x] Encryption/decryption round-trip
 * - [x] Tampering detection (modified ciphertext fails)
 * - [x] Invalid key length rejection
 * - [ ] Key rotation strategy (if needed)
 *
 * DEPENDENCIES:
 * - crypto: Node.js cryptography
 * - @/lib/core/log: Logging
 *
 * PRODUCTION READY: YES
 */
