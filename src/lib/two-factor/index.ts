/**
 * @file index.ts
 * @description Two-factor authentication module for super admin security.
 *              Provides TOTP-based authentication, backup codes, encryption,
 *              and re-verification enforcement for sensitive operations.
 * @module two-factor
 *
 * @example
 * // Setup 2FA for a user
 * import { generateTOTPSecret, generateBackupCodes } from '@/lib/two-factor';
 *
 * const setup = await generateTOTPSecret('admin@example.com');
 * const backupCodes = await generateBackupCodes();
 *
 * @example
 * // Verify TOTP code
 * import { verifyTOTPCode } from '@/lib/two-factor';
 *
 * const isValid = verifyTOTPCode(user.twoFactorSecret, '123456');
 *
 * @example
 * // Require recent 2FA for sensitive operation
 * import { requireRecent2FA } from '@/lib/two-factor';
 *
 * const require2FAResult = await requireRecent2FA(session.user.id);
 * if (require2FAResult) return require2FAResult;
 *
 * @security This module handles sensitive authentication data.
 *           - TOTP secrets are encrypted at rest using AES-256-GCM
 *           - Backup codes are bcrypt hashed before storage
 *           - Re-verification is required for high-risk operations
 */

export * from './totp';
export * from './backup-codes';
export * from './encryption';
export * from './require-recent-2fa';
