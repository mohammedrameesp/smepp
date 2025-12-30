import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Get encryption key from environment or generate a warning
 */
function getEncryptionKey(): Buffer {
  const key = process.env.TWO_FACTOR_ENCRYPTION_KEY;

  if (!key) {
    // In production, require dedicated encryption key
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'CRITICAL: TWO_FACTOR_ENCRYPTION_KEY is required in production. ' +
        'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
      );
    }
    // In development, derive from NEXTAUTH_SECRET (but NEXTAUTH_SECRET is still required)
    if (!process.env.NEXTAUTH_SECRET) {
      throw new Error('CRITICAL: NEXTAUTH_SECRET environment variable is required');
    }
    console.warn(
      'WARNING: TWO_FACTOR_ENCRYPTION_KEY not set. Using derived key from NEXTAUTH_SECRET. ' +
      'Set TWO_FACTOR_ENCRYPTION_KEY in production for better security.'
    );
    // Use a unique salt derived from app name to prevent cross-application key reuse
    const salt = crypto.createHash('sha256').update('durj-2fa-encryption').digest();
    return crypto.scryptSync(process.env.NEXTAUTH_SECRET, salt, 32);
  }

  // Key should be 32 bytes (256 bits) hex encoded = 64 characters
  if (key.length !== 64) {
    throw new Error('TWO_FACTOR_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  }

  return Buffer.from(key, 'hex');
}

/**
 * Encrypt a string value using AES-256-GCM
 */
export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Combine IV + AuthTag + Encrypted data
  return iv.toString('hex') + authTag.toString('hex') + encrypted;
}

/**
 * Decrypt a string value encrypted with encrypt()
 */
export function decrypt(encryptedText: string): string {
  const key = getEncryptionKey();

  // Extract IV, AuthTag, and encrypted data
  const iv = Buffer.from(encryptedText.slice(0, IV_LENGTH * 2), 'hex');
  const authTag = Buffer.from(encryptedText.slice(IV_LENGTH * 2, (IV_LENGTH + AUTH_TAG_LENGTH) * 2), 'hex');
  const encrypted = encryptedText.slice((IV_LENGTH + AUTH_TAG_LENGTH) * 2);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Generate a random encryption key (for initial setup)
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}
