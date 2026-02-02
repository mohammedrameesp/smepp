/**
 * @file backup-codes.ts
 * @description Two-factor authentication backup codes generation and verification.
 *              Provides one-time recovery codes for users who lose access to their
 *              authenticator app. Uses bcrypt hashing for secure storage.
 * @module two-factor
 *
 * @security Backup codes are bcrypt hashed before storage.
 *           Plain codes are only shown once during generation.
 *           Each code can only be used once and is removed after use.
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';

/** Number of characters in each backup code (excluding hyphen) */
const BACKUP_CODE_LENGTH = 8;

/** Number of backup codes to generate */
const BACKUP_CODE_COUNT = 10;

/** Bcrypt hashing rounds for backup code storage */
const BCRYPT_ROUNDS = 10;

/**
 * Characters used for backup code generation.
 * Excludes ambiguous characters: 0/O, 1/l/I
 */
const BACKUP_CODE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Result of backup code generation containing both plain and hashed codes.
 */
export interface BackupCodesResult {
  /** Plain text codes to display to user (show only once) */
  plainCodes: string[];
  /** Bcrypt hashed codes for database storage */
  hashedCodes: string[];
}

/**
 * Generates a single backup code using cryptographically secure random bytes.
 *
 * @returns Formatted backup code (e.g., "ABCD-EFGH")
 *
 * @internal
 * @security Uses crypto.randomInt for cryptographically secure randomness.
 */
function generateCode(): string {
  let code = '';

  for (let i = 0; i < BACKUP_CODE_LENGTH; i++) {
    const randomIndex = crypto.randomInt(0, BACKUP_CODE_CHARS.length);
    code += BACKUP_CODE_CHARS[randomIndex];
  }

  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

/**
 * Generates a set of backup codes for 2FA recovery.
 *
 * @returns Object containing plain codes (for user) and hashed codes (for storage)
 *
 * @example
 * const { plainCodes, hashedCodes } = await generateBackupCodes();
 * // Store hashedCodes in database
 * // Display plainCodes to user (only once!)
 *
 * @security Plain codes should only be displayed once during setup or regeneration.
 *           Store only the hashed codes in the database.
 */
export async function generateBackupCodes(): Promise<BackupCodesResult> {
  const plainCodes: string[] = [];
  const hashedCodes: string[] = [];

  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    const code = generateCode();
    plainCodes.push(code);

    const normalizedCode = code.replace('-', '').toUpperCase();
    const hashedCode = await bcrypt.hash(normalizedCode, BCRYPT_ROUNDS);
    hashedCodes.push(hashedCode);
  }

  return { plainCodes, hashedCodes };
}

/**
 * Verifies a backup code against stored hashed codes.
 *
 * @param inputCode - The backup code entered by the user
 * @param hashedCodes - Array of bcrypt hashed codes from database
 * @returns Index of matched code (for removal), or -1 if not found
 *
 * @example
 * const matchedIndex = await verifyBackupCode(userInput, user.twoFactorBackupCodes);
 * if (matchedIndex >= 0) {
 *   // Valid code - remove it from the list
 *   const updatedCodes = removeBackupCode(user.twoFactorBackupCodes, matchedIndex);
 *   await updateUser({ twoFactorBackupCodes: updatedCodes });
 * }
 *
 * @security Each backup code should only be used once.
 *           After successful verification, remove the code using removeBackupCode().
 */
export async function verifyBackupCode(
  inputCode: string,
  hashedCodes: string[]
): Promise<number> {
  const normalizedInput = inputCode.replace(/[-\s]/g, '').toUpperCase();

  for (let i = 0; i < hashedCodes.length; i++) {
    const isMatch = await bcrypt.compare(normalizedInput, hashedCodes[i]);
    if (isMatch) {
      return i;
    }
  }

  return -1;
}

/**
 * Removes a used backup code from the array.
 *
 * @param hashedCodes - Array of hashed backup codes
 * @param index - Index of the code to remove
 * @returns New array with the specified code removed
 *
 * @example
 * const updatedCodes = removeBackupCode(hashedCodes, matchedIndex);
 * await db.user.update({ data: { twoFactorBackupCodes: updatedCodes } });
 *
 * @security Always remove used backup codes to prevent reuse.
 */
export function removeBackupCode(hashedCodes: string[], index: number): string[] {
  if (index < 0 || index >= hashedCodes.length) {
    return hashedCodes;
  }

  return [...hashedCodes.slice(0, index), ...hashedCodes.slice(index + 1)];
}

/**
 * Gets the count of remaining backup codes.
 *
 * @param hashedCodes - Array of hashed backup codes
 * @returns Number of remaining codes
 *
 * @example
 * const remaining = getRemainingCodesCount(user.twoFactorBackupCodes);
 * if (remaining <= 2) {
 *   // Warn user to regenerate backup codes
 * }
 *
 * @remarks Useful for warning users when they're running low on backup codes.
 */
export function getRemainingCodesCount(hashedCodes: string[]): number {
  return hashedCodes.length;
}

/*
 * ========== CODE REVIEW SUMMARY ==========
 * File: backup-codes.ts
 * Reviewed: 2025-01-29

 * SECURITY NOTES:
 * - Uses crypto.randomInt for cryptographically secure code generation
 * - Backup codes are bcrypt hashed (10 rounds) before storage
 * - Codes use unambiguous character set to prevent user error
 * - Each code can only be used once
 *
 * REMAINING CONCERNS:
 * - None
 *
 * REQUIRED TESTS:
 * - [x] Code generation produces correct format (XXXX-XXXX)
 * - [x] Verification works with valid codes
 * - [x] Verification fails with invalid codes
 * - [x] Code removal works correctly
 * - [ ] Verify uniqueness across large code sets
 *
 * DEPENDENCIES:
 * - crypto: Secure random number generation
 * - bcryptjs: Password hashing
 *

 */
