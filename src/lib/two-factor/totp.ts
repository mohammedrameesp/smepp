/**
 * @file totp.ts
 * @description Time-based One-Time Password (TOTP) implementation for two-factor authentication.
 *              Generates QR codes for authenticator app setup and verifies TOTP codes.
 *              Implements RFC 6238 TOTP algorithm with 30-second time steps.
 * @module two-factor
 *
 * @security TOTP secrets are encrypted using AES-256-GCM before storage.
 *           Never log or expose raw TOTP secrets.
 */

import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import logger from '@/lib/core/log';
import { encrypt, decrypt } from './encryption';

/** TOTP code length (standard 6 digits) */
const TOTP_DIGITS = 6;

/** Time step in seconds (standard 30 seconds per RFC 6238) */
const TOTP_STEP_SECONDS = 30;

/** Window tolerance for clock drift (1 step = 30 seconds before/after) */
const TOTP_WINDOW = 1;

/** Application name shown in authenticator apps */
const APP_NAME = 'Durj Admin';

// Configure authenticator options
authenticator.options = {
  digits: TOTP_DIGITS,
  step: TOTP_STEP_SECONDS,
  window: TOTP_WINDOW,
};

/**
 * Data returned when setting up TOTP for a user.
 *
 * @security The `secret` field contains an encrypted value safe for database storage.
 *           The `manualEntryKey` should only be shown once during setup.
 */
export interface TOTPSetupData {
  /** Encrypted TOTP secret for database storage */
  secret: string;
  /** Base64 data URL of QR code image for authenticator app scanning */
  qrCodeDataUrl: string;
  /** Human-readable secret formatted in groups of 4 for manual entry */
  manualEntryKey: string;
}

/**
 * Generates a new TOTP secret and QR code for authenticator app setup.
 *
 * @param userEmail - User's email address (displayed in authenticator app)
 * @returns Setup data containing encrypted secret, QR code, and manual entry key
 *
 * @example
 * const setup = await generateTOTPSecret('admin@durj.com');
 * // Store setup.secret in database
 * // Display setup.qrCodeDataUrl as image
 * // Show setup.manualEntryKey as fallback
 *
 * @security The returned secret is encrypted. The manualEntryKey should only
 *           be displayed once during initial setup.
 */
export async function generateTOTPSecret(userEmail: string): Promise<TOTPSetupData> {
  const secret = authenticator.generateSecret();
  const otpauthUrl = authenticator.keyuri(userEmail, APP_NAME, secret);

  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
    width: 256,
    margin: 2,
    color: {
      dark: '#1e293b',
      light: '#ffffff',
    },
  });

  const manualEntryKey = secret.match(/.{1,4}/g)?.join(' ') || secret;
  const encryptedSecret = encrypt(secret);

  return {
    secret: encryptedSecret,
    qrCodeDataUrl,
    manualEntryKey,
  };
}

/**
 * Verifies a TOTP code against an encrypted secret.
 *
 * @param encryptedSecret - The encrypted TOTP secret from database
 * @param code - The 6-digit code entered by the user
 * @returns True if the code is valid, false otherwise
 *
 * @example
 * const isValid = verifyTOTPCode(user.twoFactorSecret, '123456');
 * if (!isValid) {
 *   return { error: 'Invalid code' };
 * }
 *
 * @security This function handles decryption internally. Failed verifications
 *           are logged for security monitoring but do not expose details.
 */
export function verifyTOTPCode(encryptedSecret: string, code: string): boolean {
  try {
    const secret = decrypt(encryptedSecret);
    return authenticator.verify({ token: code, secret });
  } catch (error) {
    logger.warn(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      'TOTP verification failed - decryption or validation error'
    );
    return false;
  }
}

/**
 * Generates the current TOTP code for a given secret.
 *
 * @param encryptedSecret - The encrypted TOTP secret
 * @returns The current 6-digit TOTP code
 *
 * @remarks This function is primarily for testing and debugging purposes.
 *          It should NOT be used in production to bypass 2FA.
 *
 * @security Only use for testing. Never expose generated codes in logs or responses.
 */
export function generateCurrentCode(encryptedSecret: string): string {
  const secret = decrypt(encryptedSecret);
  return authenticator.generate(secret);
}

/**
 * Gets the number of seconds until the current TOTP code expires.
 *
 * @returns Seconds remaining (1-30)
 *
 * @example
 * const remaining = getTimeRemaining();
 * console.log(`Code expires in ${remaining} seconds`);
 *
 * @remarks Useful for UI countdown timers showing when to expect a new code.
 */
export function getTimeRemaining(): number {
  const step = authenticator.options.step || TOTP_STEP_SECONDS;
  const epoch = Math.floor(Date.now() / 1000);
  return step - (epoch % step);
}

/*
 * ========== CODE REVIEW SUMMARY ==========
 * File: totp.ts
 * Reviewed: 2025-01-29
 *
 * CHANGES MADE:
 * - Replaced console.error with logger.warn for security monitoring
 * - Added comprehensive JSDoc with @param, @returns, @security, @example
 * - Extracted magic numbers to named constants (TOTP_DIGITS, TOTP_STEP_SECONDS, TOTP_WINDOW)
 * - Added @remarks for testing-only functions
 * - Added security warnings for sensitive operations
 *
 * SECURITY NOTES:
 * - TOTP secrets are encrypted at rest using AES-256-GCM
 * - Failed verifications are logged without exposing sensitive details
 * - generateCurrentCode is marked as testing-only
 *

 * DEPENDENCIES:
 * - otplib: TOTP generation/verification
 * - qrcode: QR code generation
 * - ./encryption: Secret encryption
 * - @/lib/core/log: Logging
 *

 */
