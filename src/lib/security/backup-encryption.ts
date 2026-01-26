/**
 * @file backup-encryption.ts
 * @description AES-256-GCM encryption for database backups with sensitive data redaction.
 *              Provides defense-in-depth by both encrypting backups and redacting sensitive fields.
 * @module security
 *
 * ════════════════════════════════════════════════════════════════════════════════
 * SECURITY NOTES:
 * ════════════════════════════════════════════════════════════════════════════════
 *
 * ENCRYPTION:
 * - Algorithm: AES-256-GCM (authenticated encryption)
 * - Key derivation: scrypt (memory-hard, resistant to hardware attacks)
 * - Each encryption generates unique salt + IV
 *
 * FORMAT: salt (32 bytes) + iv (16 bytes) + authTag (16 bytes) + ciphertext
 *
 * MINIMUM BUFFER SIZE: 64 bytes (32 + 16 + 16 for headers, before ciphertext)
 *
 * @security All encryption operations fail-closed (throw on error)
 * @security Key must be set via BACKUP_ENCRYPTION_KEY in production
 */

import crypto from 'crypto';
import logger from '@/lib/core/log';

/** AES-256-GCM provides authenticated encryption */
const ALGORITHM = 'aes-256-gcm';

/** Initialization vector length in bytes (128 bits for AES-GCM) */
const IV_LENGTH = 16;

/** Authentication tag length in bytes (128 bits) */
const AUTH_TAG_LENGTH = 16;

/** Salt length for key derivation in bytes (256 bits) */
const SALT_LENGTH = 32;

/** Derived key length in bytes (256 bits for AES-256) */
const KEY_LENGTH = 32;

/** Minimum expected key length when provided as hex (64 hex chars = 32 bytes) */
const MIN_HEX_KEY_LENGTH = 32;

/** Minimum encrypted buffer size (salt + iv + authTag) */
const MIN_ENCRYPTED_SIZE = SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH;

/**
 * Error thrown when backup encryption operations fail
 */
export class BackupEncryptionError extends Error {
  constructor(
    message: string,
    public readonly code: 'KEY_MISSING' | 'KEY_INVALID' | 'ENCRYPT_FAILED' | 'DECRYPT_FAILED' | 'INVALID_INPUT'
  ) {
    super(message);
    this.name = 'BackupEncryptionError';
  }
}

/**
 * Get the backup encryption key from environment
 *
 * @throws {BackupEncryptionError} If key is missing in production or invalid
 * @security This key MUST be set in production
 */
function getBackupEncryptionKey(): string {
  const key = process.env.BACKUP_ENCRYPTION_KEY;

  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      throw new BackupEncryptionError(
        'CRITICAL: BACKUP_ENCRYPTION_KEY is required in production. ' +
        'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
        'KEY_MISSING'
      );
    }
    // In development, derive from NEXTAUTH_SECRET
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      throw new BackupEncryptionError(
        'CRITICAL: Either BACKUP_ENCRYPTION_KEY or NEXTAUTH_SECRET must be set',
        'KEY_MISSING'
      );
    }
    logger.warn(
      { event: 'BACKUP_KEY_DERIVED' },
      'Using derived backup encryption key from NEXTAUTH_SECRET. Set BACKUP_ENCRYPTION_KEY in production.'
    );
    return secret;
  }

  // Validate key length (should be at least 32 chars, ideally 64 hex chars for 256-bit key)
  if (key.length < MIN_HEX_KEY_LENGTH) {
    throw new BackupEncryptionError(
      `BACKUP_ENCRYPTION_KEY too short: ${key.length} chars, minimum ${MIN_HEX_KEY_LENGTH} required`,
      'KEY_INVALID'
    );
  }

  return key;
}

/**
 * Encrypt backup data using AES-256-GCM
 *
 * @param data - The string data to encrypt (must be non-empty)
 * @returns Buffer containing: salt (32 bytes) + iv (16 bytes) + authTag (16 bytes) + ciphertext
 * @throws {BackupEncryptionError} If data is empty or encryption fails
 *
 * @security Uses unique salt and IV for each encryption
 * @security scrypt KDF with memory-hard parameters
 */
export function encryptBackup(data: string): Buffer {
  // Input validation
  if (!data || typeof data !== 'string') {
    throw new BackupEncryptionError(
      'Backup data must be a non-empty string',
      'INVALID_INPUT'
    );
  }

  try {
    const key = getBackupEncryptionKey();
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);

    // Derive key from master key + unique salt using scrypt
    // scrypt is memory-hard, making hardware attacks expensive
    const derivedKey = crypto.scryptSync(key, salt, KEY_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv);
    const encrypted = Buffer.concat([
      cipher.update(data, 'utf8'),
      cipher.final()
    ]);
    const authTag = cipher.getAuthTag();

    // Combine: salt + iv + authTag + encrypted
    const result = Buffer.concat([salt, iv, authTag, encrypted]);

    logger.info(
      { event: 'BACKUP_ENCRYPTED', size: result.length },
      'Backup data encrypted successfully'
    );

    return result;
  } catch (error) {
    // Re-throw BackupEncryptionError as-is
    if (error instanceof BackupEncryptionError) {
      throw error;
    }

    logger.error(
      { event: 'BACKUP_ENCRYPT_ERROR', error: error instanceof Error ? error.message : String(error) },
      'Failed to encrypt backup data'
    );
    throw new BackupEncryptionError(
      `Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'ENCRYPT_FAILED'
    );
  }
}

/**
 * Decrypt backup data
 *
 * @param encryptedBuffer - Buffer containing: salt (32) + iv (16) + authTag (16) + ciphertext
 * @returns Decrypted string data
 * @throws {BackupEncryptionError} If buffer is too small, corrupted, or decryption fails
 *
 * @security Authentication tag verification prevents tampering
 * @security Will throw if data has been modified (integrity check)
 */
export function decryptBackup(encryptedBuffer: Buffer): string {
  // Input validation
  if (!encryptedBuffer || !Buffer.isBuffer(encryptedBuffer)) {
    throw new BackupEncryptionError(
      'Encrypted data must be a Buffer',
      'INVALID_INPUT'
    );
  }

  if (encryptedBuffer.length < MIN_ENCRYPTED_SIZE) {
    throw new BackupEncryptionError(
      `Encrypted buffer too small: ${encryptedBuffer.length} bytes, minimum ${MIN_ENCRYPTED_SIZE} required`,
      'INVALID_INPUT'
    );
  }

  try {
    const key = getBackupEncryptionKey();

    // Extract components from buffer
    const salt = encryptedBuffer.subarray(0, SALT_LENGTH);
    const iv = encryptedBuffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = encryptedBuffer.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = encryptedBuffer.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

    // Derive the same key from master key + salt
    const derivedKey = crypto.scryptSync(key, salt, KEY_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);

    logger.info(
      { event: 'BACKUP_DECRYPTED', inputSize: encryptedBuffer.length, outputSize: decrypted.length },
      'Backup data decrypted successfully'
    );

    return decrypted.toString('utf8');
  } catch (error) {
    // Re-throw BackupEncryptionError as-is
    if (error instanceof BackupEncryptionError) {
      throw error;
    }

    // GCM authentication failure indicates tampered data
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isTampered = errorMessage.includes('Unsupported state') ||
                       errorMessage.includes('unable to authenticate');

    logger.error(
      {
        event: 'BACKUP_DECRYPT_ERROR',
        error: errorMessage,
        tampered: isTampered
      },
      isTampered ? 'Backup data integrity check failed (possibly tampered)' : 'Failed to decrypt backup data'
    );

    throw new BackupEncryptionError(
      isTampered
        ? 'Decryption failed: data integrity check failed (backup may be corrupted or tampered)'
        : `Decryption failed: ${errorMessage}`,
      'DECRYPT_FAILED'
    );
  }
}

/**
 * Sensitive fields that should be redacted from backups
 * @security Defense-in-depth: redaction happens BEFORE encryption
 * @security Even if encryption key is compromised, these fields are still protected
 */
const SENSITIVE_USER_FIELDS = [
  'passwordHash',
  'twoFactorSecret',
  'twoFactorBackupCodes',
  'resetToken',
  'resetTokenExpiry',
  'setupToken',
  'setupTokenExpiry',
] as const;

/**
 * Sensitive organization fields (OAuth secrets)
 */
const SENSITIVE_ORG_FIELDS = [
  'googleClientSecret',
  'azureClientSecret',
] as const;

/**
 * Sensitive team member fields (PII and financial)
 */
const SENSITIVE_TEAM_MEMBER_FIELDS = [
  'bankAccountNumber',
  'bankRoutingNumber',
  'nationalId',
  'taxId',
  'socialSecurityNumber',
  'passportNumber',
] as const;

/**
 * Redact sensitive fields from user objects
 *
 * @param user - User object to redact
 * @returns Shallow copy with sensitive fields replaced with '[REDACTED]'
 *
 * @security This is in ADDITION to encryption - defense in depth
 * @security Null/undefined values are not redacted (no data to protect)
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
 *
 * @param org - Organization object to redact
 * @returns Shallow copy with sensitive fields replaced with '[REDACTED]'
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
 * Redact sensitive fields from team member objects
 *
 * @param member - TeamMember object to redact
 * @returns Shallow copy with sensitive fields replaced with '[REDACTED]'
 */
export function redactSensitiveTeamMemberData<T extends Record<string, unknown>>(member: T): T {
  const redacted: Record<string, unknown> = { ...member };
  for (const field of SENSITIVE_TEAM_MEMBER_FIELDS) {
    if (field in redacted && redacted[field]) {
      redacted[field] = '[REDACTED]';
    }
  }
  return redacted as T;
}

/**
 * Process backup data to redact sensitive information
 *
 * @param data - Backup data object containing users, organizations, and/or teamMembers
 * @returns Shallow copy with all sensitive fields redacted
 *
 * @security Redacts: users, organizations, teamMembers
 * @security Handles both array and single-object formats
 */
export function redactBackupData(data: {
  users?: Array<Record<string, unknown>>;
  organizations?: Array<Record<string, unknown>>;
  organization?: Record<string, unknown> | null;
  teamMembers?: Array<Record<string, unknown>>;
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

  // Redact team member data (PII and financial info)
  if (Array.isArray(redacted.teamMembers)) {
    redacted.teamMembers = redacted.teamMembers.map(member => redactSensitiveTeamMemberData(member));
  }

  return redacted;
}

/**
 * Check if backup encryption is properly configured
 *
 * @returns true if BACKUP_ENCRYPTION_KEY or NEXTAUTH_SECRET is set
 *
 * @note In production, BACKUP_ENCRYPTION_KEY should be explicitly set
 * @note In development, NEXTAUTH_SECRET can be used as fallback
 */
export function isBackupEncryptionConfigured(): boolean {
  return !!(process.env.BACKUP_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET);
}

// Export constants for testing
export const _testing = {
  MIN_ENCRYPTED_SIZE,
  SENSITIVE_USER_FIELDS,
  SENSITIVE_ORG_FIELDS,
  SENSITIVE_TEAM_MEMBER_FIELDS,
};
