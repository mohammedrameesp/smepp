import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { encrypt, decrypt } from './encryption';

// Configure authenticator options
authenticator.options = {
  digits: 6,
  step: 30, // 30 second window
  window: 1, // Allow 1 step before/after for clock drift
};

const APP_NAME = 'Durj Admin';

export interface TOTPSetupData {
  secret: string; // Encrypted secret for storage
  qrCodeDataUrl: string; // Data URL for QR code image
  manualEntryKey: string; // Human-readable secret for manual entry
}

/**
 * Generate a new TOTP secret and QR code for setup
 */
export async function generateTOTPSecret(userEmail: string): Promise<TOTPSetupData> {
  // Generate a random secret
  const secret = authenticator.generateSecret();

  // Create the otpauth URL
  const otpauthUrl = authenticator.keyuri(userEmail, APP_NAME, secret);

  // Generate QR code as data URL
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
    width: 256,
    margin: 2,
    color: {
      dark: '#1e293b', // slate-800
      light: '#ffffff',
    },
  });

  // Format secret for manual entry (groups of 4 characters)
  const manualEntryKey = secret.match(/.{1,4}/g)?.join(' ') || secret;

  // Encrypt secret for storage
  const encryptedSecret = encrypt(secret);

  return {
    secret: encryptedSecret,
    qrCodeDataUrl,
    manualEntryKey,
  };
}

/**
 * Verify a TOTP code against an encrypted secret
 */
export function verifyTOTPCode(encryptedSecret: string, code: string): boolean {
  try {
    const secret = decrypt(encryptedSecret);
    return authenticator.verify({ token: code, secret });
  } catch (error) {
    console.error('Failed to verify TOTP code:', error);
    return false;
  }
}

/**
 * Generate a current TOTP code (for testing purposes)
 */
export function generateCurrentCode(encryptedSecret: string): string {
  const secret = decrypt(encryptedSecret);
  return authenticator.generate(secret);
}

/**
 * Get the time remaining until the current code expires
 */
export function getTimeRemaining(): number {
  const step = authenticator.options.step || 30;
  const epoch = Math.floor(Date.now() / 1000);
  return step - (epoch % step);
}
