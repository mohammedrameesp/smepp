import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const BACKUP_CODE_LENGTH = 8;
const BACKUP_CODE_COUNT = 10;
const BCRYPT_ROUNDS = 10;

export interface BackupCodesResult {
  plainCodes: string[]; // Show to user once
  hashedCodes: string[]; // Store in database
}

/**
 * Generate a single backup code (alphanumeric, easy to read)
 */
function generateCode(): string {
  // Use characters that are easy to distinguish (no 0/O, 1/l/I)
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';

  for (let i = 0; i < BACKUP_CODE_LENGTH; i++) {
    const randomIndex = crypto.randomInt(0, chars.length);
    code += chars[randomIndex];
  }

  // Format as XXXX-XXXX for readability
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

/**
 * Generate a set of backup codes
 */
export async function generateBackupCodes(): Promise<BackupCodesResult> {
  const plainCodes: string[] = [];
  const hashedCodes: string[] = [];

  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    const code = generateCode();
    plainCodes.push(code);

    // Hash the code for storage (remove dash for consistency)
    const normalizedCode = code.replace('-', '').toUpperCase();
    const hashedCode = await bcrypt.hash(normalizedCode, BCRYPT_ROUNDS);
    hashedCodes.push(hashedCode);
  }

  return { plainCodes, hashedCodes };
}

/**
 * Verify a backup code against the stored hashed codes
 * Returns the index of the matched code (for removal) or -1 if not found
 */
export async function verifyBackupCode(
  inputCode: string,
  hashedCodes: string[]
): Promise<number> {
  // Normalize input: remove dashes/spaces, uppercase
  const normalizedInput = inputCode.replace(/[-\s]/g, '').toUpperCase();

  // Check against each hashed code
  for (let i = 0; i < hashedCodes.length; i++) {
    const isMatch = await bcrypt.compare(normalizedInput, hashedCodes[i]);
    if (isMatch) {
      return i;
    }
  }

  return -1;
}

/**
 * Remove a used backup code from the list
 */
export function removeBackupCode(hashedCodes: string[], index: number): string[] {
  if (index < 0 || index >= hashedCodes.length) {
    return hashedCodes;
  }

  return [...hashedCodes.slice(0, index), ...hashedCodes.slice(index + 1)];
}

/**
 * Get the count of remaining backup codes
 */
export function getRemainingCodesCount(hashedCodes: string[]): number {
  return hashedCodes.length;
}
