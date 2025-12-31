/**
 * @file backup-encryption.ts
 * @description AES-256-GCM encryption for database backups with sensitive data redaction.
 *              Provides defense-in-depth by both encrypting backups and redacting sensitive fields.
 * @module security
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;

/**
 * Get the backup encryption key from environment
 * SECURITY: This key MUST be set in production
 */
function getBackupEncryptionKey(): string {
  const key = process.env.BACKUP_ENCRYPTION_KEY;

  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'CRITICAL: BACKUP_ENCRYPTION_KEY is required in production. ' +
        'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
      );
    }
    // In development, derive from NEXTAUTH_SECRET
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      throw new Error('CRITICAL: Either BACKUP_ENCRYPTION_KEY or NEXTAUTH_SECRET must be set');
    }
    console.warn('WARNING: Using derived backup encryption key from NEXTAUTH_SECRET. Set BACKUP_ENCRYPTION_KEY in production.');
    return secret;
  }

  return key;
}

/**
 * Encrypt backup data using AES-256-GCM
 * Returns: salt (32 bytes) + iv (16 bytes) + authTag (16 bytes) + encryptedData
 */
export function encryptBackup(data: string): Buffer {
  const key = getBackupEncryptionKey();
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);

  // Derive key from password + salt
  const derivedKey = crypto.scryptSync(key, salt, KEY_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv);
  const encrypted = Buffer.concat([
    cipher.update(data, 'utf8'),
    cipher.final()
  ]);
  const authTag = cipher.getAuthTag();

  // Combine: salt + iv + authTag + encrypted
  return Buffer.concat([salt, iv, authTag, encrypted]);
}

/**
 * Decrypt backup data
 * Input: salt (32 bytes) + iv (16 bytes) + authTag (16 bytes) + encryptedData
 */
export function decryptBackup(encryptedBuffer: Buffer): string {
  const key = getBackupEncryptionKey();

  // Extract components
  const salt = encryptedBuffer.subarray(0, SALT_LENGTH);
  const iv = encryptedBuffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = encryptedBuffer.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = encryptedBuffer.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

  // Derive key from password + salt
  const derivedKey = crypto.scryptSync(key, salt, KEY_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]);

  return decrypted.toString('utf8');
}

/**
 * Sensitive fields that should be redacted from backups
 */
const SENSITIVE_USER_FIELDS = [
  'passwordHash',
  'twoFactorSecret',
  'twoFactorBackupCodes',
  'resetToken',
  'resetTokenExpiry',
  'setupToken',
  'setupTokenExpiry',
];

const SENSITIVE_ORG_FIELDS = [
  'googleClientSecret',
  'azureClientSecret',
];

/**
 * Redact sensitive fields from user objects
 * This is in ADDITION to encryption - defense in depth
 */
export function redactSensitiveUserData<T extends Record<string, unknown>>(user: T): T {
  const redacted: Record<string, unknown> = { ...user };
  for (const field of SENSITIVE_USER_FIELDS) {
    if (field in redacted && redacted[field]) {
      redacted[field] = '[REDACTED]';
    }
  }
  return redacted as T;
}

/**
 * Redact sensitive fields from organization objects
 */
export function redactSensitiveOrgData<T extends Record<string, unknown>>(org: T): T {
  const redacted: Record<string, unknown> = { ...org };
  for (const field of SENSITIVE_ORG_FIELDS) {
    if (field in redacted && redacted[field]) {
      redacted[field] = '[REDACTED]';
    }
  }
  return redacted as T;
}

/**
 * Process backup data to redact sensitive information
 */
export function redactBackupData(data: {
  users?: Array<Record<string, unknown>>;
  organizations?: Array<Record<string, unknown>>;
  organization?: Record<string, unknown> | null;
  [key: string]: unknown;
}): typeof data {
  const redacted = { ...data };

  // Redact user data
  if (Array.isArray(redacted.users)) {
    redacted.users = redacted.users.map(user => redactSensitiveUserData(user));
  }

  // Redact organization data (array of orgs in full backup)
  if (Array.isArray(redacted.organizations)) {
    redacted.organizations = redacted.organizations.map(org => redactSensitiveOrgData(org));
  }

  // Redact single organization (in org-specific backup)
  if (redacted.organization && typeof redacted.organization === 'object') {
    redacted.organization = redactSensitiveOrgData(redacted.organization as Record<string, unknown>);
  }

  return redacted;
}

/**
 * Check if backup encryption is configured
 */
export function isBackupEncryptionConfigured(): boolean {
  return !!(process.env.BACKUP_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET);
}
