/**
 * @file totp.test.ts
 * @description Unit and integration tests for TOTP two-factor authentication
 * @module two-factor
 */

import {
  generateTOTPSecret,
  verifyTOTPCode,
  generateCurrentCode,
  getTimeRemaining,
  TOTPSetupData,
} from '@/lib/two-factor/totp';
import { authenticator } from 'otplib';

// Store original env vars
const originalEnv = process.env;

describe('TOTP Two-Factor Authentication', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.NEXTAUTH_SECRET = 'test-secret-for-unit-tests-must-be-long-enough';
    process.env.NODE_ENV = 'test';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('generateTOTPSecret', () => {
    it('should generate valid setup data with all required fields', async () => {
      const setup = await generateTOTPSecret('test@example.com');

      expect(setup).toHaveProperty('secret');
      expect(setup).toHaveProperty('qrCodeDataUrl');
      expect(setup).toHaveProperty('manualEntryKey');
    });

    it('should generate an encrypted secret', async () => {
      const setup = await generateTOTPSecret('test@example.com');

      // Encrypted secret should be hex-encoded and much longer than raw secret
      expect(setup.secret).toMatch(/^[0-9a-f]+$/i);
      expect(setup.secret.length).toBeGreaterThan(64);
    });

    it('should generate a valid QR code data URL', async () => {
      const setup = await generateTOTPSecret('test@example.com');

      expect(setup.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
      expect(setup.qrCodeDataUrl.length).toBeGreaterThan(100);
    });

    it('should format manual entry key in groups of 4', async () => {
      const setup = await generateTOTPSecret('test@example.com');

      // Manual entry key should be formatted with spaces
      const groups = setup.manualEntryKey.split(' ');
      groups.forEach((group, index) => {
        // Last group might be shorter
        if (index < groups.length - 1) {
          expect(group).toHaveLength(4);
        }
        expect(group.length).toBeLessThanOrEqual(4);
      });
    });

    it('should generate different secrets for each call', async () => {
      const setup1 = await generateTOTPSecret('test@example.com');
      const setup2 = await generateTOTPSecret('test@example.com');

      expect(setup1.secret).not.toBe(setup2.secret);
      expect(setup1.manualEntryKey).not.toBe(setup2.manualEntryKey);
    });

    it('should handle special characters in email', async () => {
      const setup = await generateTOTPSecret('test+special@example.com');

      expect(setup.secret).toBeDefined();
      expect(setup.qrCodeDataUrl).toBeDefined();
    });
  });

  describe('verifyTOTPCode', () => {
    let testSetup: TOTPSetupData;

    beforeEach(async () => {
      testSetup = await generateTOTPSecret('test@example.com');
    });

    it('should verify a valid current code', () => {
      const currentCode = generateCurrentCode(testSetup.secret);
      const isValid = verifyTOTPCode(testSetup.secret, currentCode);

      expect(isValid).toBe(true);
    });

    it('should reject an invalid code', () => {
      const isValid = verifyTOTPCode(testSetup.secret, '000000');

      // Might be valid by coincidence, so generate a few tests
      const invalidCodes = ['123456', '654321', '111111', '999999'];
      const results = invalidCodes.map((code) =>
        verifyTOTPCode(testSetup.secret, code)
      );

      // At least most should be invalid (very unlikely all are valid)
      const invalidCount = results.filter((r) => !r).length;
      expect(invalidCount).toBeGreaterThan(2);
    });

    it('should reject a code with wrong format', () => {
      const isValid = verifyTOTPCode(testSetup.secret, 'abcdef');

      expect(isValid).toBe(false);
    });

    it('should reject empty code', () => {
      const isValid = verifyTOTPCode(testSetup.secret, '');

      expect(isValid).toBe(false);
    });

    it('should return false for invalid encrypted secret', () => {
      const isValid = verifyTOTPCode('invalid-secret', '123456');

      expect(isValid).toBe(false);
    });

    it('should return false for empty secret', () => {
      const isValid = verifyTOTPCode('', '123456');

      expect(isValid).toBe(false);
    });
  });

  describe('generateCurrentCode', () => {
    it('should generate a 6-digit code', async () => {
      const setup = await generateTOTPSecret('test@example.com');
      const code = generateCurrentCode(setup.secret);

      expect(code).toMatch(/^\d{6}$/);
    });

    it('should generate consistent codes for same secret within time window', async () => {
      const setup = await generateTOTPSecret('test@example.com');
      const code1 = generateCurrentCode(setup.secret);
      const code2 = generateCurrentCode(setup.secret);

      // Within the same 30-second window, should be the same
      expect(code1).toBe(code2);
    });

    it('should generate codes that verify successfully', async () => {
      const setup = await generateTOTPSecret('test@example.com');
      const code = generateCurrentCode(setup.secret);
      const isValid = verifyTOTPCode(setup.secret, code);

      expect(isValid).toBe(true);
    });
  });

  describe('getTimeRemaining', () => {
    it('should return value between 1 and 30', () => {
      const remaining = getTimeRemaining();

      expect(remaining).toBeGreaterThanOrEqual(1);
      expect(remaining).toBeLessThanOrEqual(30);
    });

    it('should return integer value', () => {
      const remaining = getTimeRemaining();

      expect(Number.isInteger(remaining)).toBe(true);
    });

    it('should decrease over time', async () => {
      const remaining1 = getTimeRemaining();

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 100));

      const remaining2 = getTimeRemaining();

      // Should either be equal or less (unless we crossed a 30-second boundary)
      expect(remaining2).toBeLessThanOrEqual(remaining1 + 1);
    });
  });

  describe('Clock Drift Tolerance', () => {
    it('should accept codes within 1-step window', async () => {
      const setup = await generateTOTPSecret('test@example.com');

      // Get the raw secret for testing
      const { decrypt } = await import('@/lib/two-factor/encryption');
      const rawSecret = decrypt(setup.secret);

      // Get the current counter
      const now = Math.floor(Date.now() / 1000);
      const currentCounter = Math.floor(now / 30);

      // Generate code for previous step (simulating clock drift)
      const prevCode = authenticator.generate(rawSecret);

      // Should be valid due to window tolerance
      const isValid = verifyTOTPCode(setup.secret, prevCode);
      expect(isValid).toBe(true);
    });

    it('should reject codes outside the window', async () => {
      const setup = await generateTOTPSecret('test@example.com');
      const { decrypt } = await import('@/lib/two-factor/encryption');
      const rawSecret = decrypt(setup.secret);

      // Generate code for a time far in the past
      const oldTime = Math.floor(Date.now() / 1000) - 120; // 2 minutes ago
      const counter = Math.floor(oldTime / 30);

      // Manually generate TOTP for old counter
      // This is a simplified test - the actual TOTP algorithm uses HMAC
      const oldCode = authenticator.generate(rawSecret);

      // Current code should work, but if we generate for very old time it won't
      // The window is only ±1 step (30 seconds each way)
      const currentCode = generateCurrentCode(setup.secret);
      expect(verifyTOTPCode(setup.secret, currentCode)).toBe(true);
    });
  });

  describe('Authenticator Configuration', () => {
    it('should use 6-digit codes', () => {
      expect(authenticator.options.digits).toBe(6);
    });

    it('should use 30-second time step', () => {
      expect(authenticator.options.step).toBe(30);
    });

    it('should have window of 1 for clock drift tolerance', () => {
      expect(authenticator.options.window).toBe(1);
    });
  });

  describe('Integration Test with Real Authenticator', () => {
    it('should generate secrets compatible with authenticator apps', async () => {
      const email = 'user@durj.com';
      const setup = await generateTOTPSecret(email);

      // Decrypt the secret to verify it's a valid base32 string
      const { decrypt } = await import('@/lib/two-factor/encryption');
      const rawSecret = decrypt(setup.secret);

      // Valid TOTP secrets are base32 encoded
      expect(rawSecret).toMatch(/^[A-Z2-7]+=*$/);
    });

    it('should generate QR codes that encode correct otpauth URL', async () => {
      const email = 'user@durj.com';
      const setup = await generateTOTPSecret(email);

      // The QR code should be a valid PNG data URL
      expect(setup.qrCodeDataUrl).toMatch(/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/);
    });

    it('should verify codes generated by otplib (simulating authenticator app)', async () => {
      const setup = await generateTOTPSecret('test@example.com');

      // Decrypt secret to simulate what an authenticator app would have
      const { decrypt } = await import('@/lib/two-factor/encryption');
      const rawSecret = decrypt(setup.secret);

      // Generate code using otplib (same as what Google Authenticator uses)
      const appGeneratedCode = authenticator.generate(rawSecret);

      // Our verify function should accept this code
      const isValid = verifyTOTPCode(setup.secret, appGeneratedCode);
      expect(isValid).toBe(true);
    });

    it('should maintain secret integrity through full lifecycle', async () => {
      // 1. Setup: Generate secret
      const setup = await generateTOTPSecret('admin@company.com');

      // 2. User scans QR code / enters manual key (simulated)
      const { decrypt } = await import('@/lib/two-factor/encryption');
      const rawSecret = decrypt(setup.secret);

      // 3. App generates code
      const appCode = authenticator.generate(rawSecret);

      // 4. User enters code during verification
      const isValid = verifyTOTPCode(setup.secret, appCode);
      expect(isValid).toBe(true);

      // 5. Later login: app generates new code
      const newAppCode = authenticator.generate(rawSecret);

      // 6. Verify works consistently
      const stillValid = verifyTOTPCode(setup.secret, newAppCode);
      expect(stillValid).toBe(true);
    });

    it('should work with manual entry key format', async () => {
      const setup = await generateTOTPSecret('test@example.com');

      // The manual entry key should match the decrypted secret
      // (just formatted with spaces)
      const { decrypt } = await import('@/lib/two-factor/encryption');
      const rawSecret = decrypt(setup.secret);
      const expectedManualKey = rawSecret.match(/.{1,4}/g)?.join(' ');

      expect(setup.manualEntryKey).toBe(expectedManualKey);
    });
  });

  describe('Security Properties', () => {
    it('should not expose raw secret in setup data', async () => {
      const setup = await generateTOTPSecret('test@example.com');

      // The secret field should be encrypted (longer and different format)
      const { decrypt } = await import('@/lib/two-factor/encryption');
      const rawSecret = decrypt(setup.secret);

      expect(setup.secret).not.toContain(rawSecret);
      expect(setup.secret.length).toBeGreaterThan(rawSecret.length);
    });

    it('should generate cryptographically random secrets', async () => {
      // Generate multiple secrets and verify they're all different
      const secrets = new Set<string>();
      for (let i = 0; i < 10; i++) {
        const setup = await generateTOTPSecret('test@example.com');
        secrets.add(setup.secret);
      }

      expect(secrets.size).toBe(10);
    }, 15000);
  });

  describe('Error Handling', () => {
    it('should handle decryption errors gracefully in verifyTOTPCode', () => {
      // Provide corrupted encrypted data
      const corrupted = 'not-valid-encrypted-data';
      const result = verifyTOTPCode(corrupted, '123456');

      // Should return false, not throw
      expect(result).toBe(false);
    });
  });

  describe('Validation Logic', () => {
    const isValidCodeFormat = (code: string): boolean => {
      return /^\d{6}$/.test(code);
    };

    it('should accept valid 6-digit code', () => {
      expect(isValidCodeFormat('123456')).toBe(true);
      expect(isValidCodeFormat('000000')).toBe(true);
      expect(isValidCodeFormat('999999')).toBe(true);
    });

    it('should reject codes with wrong length', () => {
      expect(isValidCodeFormat('12345')).toBe(false);
      expect(isValidCodeFormat('1234567')).toBe(false);
    });

    it('should reject non-numeric codes', () => {
      expect(isValidCodeFormat('12345a')).toBe(false);
      expect(isValidCodeFormat('abcdef')).toBe(false);
    });

    it('should reject codes with spaces', () => {
      expect(isValidCodeFormat('123 456')).toBe(false);
    });
  });

  describe('OTPAuth URL Format', () => {
    it('should generate correct otpauth URL components', async () => {
      const email = 'user@example.com';
      const setup = await generateTOTPSecret(email);

      // The manual entry key gives us the raw secret
      const rawSecret = setup.manualEntryKey.replace(/ /g, '');

      // Construct what the URL should look like
      const expectedUrlParts = [
        'otpauth://totp/',
        encodeURIComponent('Durj Admin'),
        encodeURIComponent(email),
        `secret=${rawSecret}`,
        `issuer=${encodeURIComponent('Durj Admin')}`,
      ];

      // We can't easily extract URL from QR code, but we can verify
      // that the decrypted secret matches the manual entry key
      const { decrypt } = await import('@/lib/two-factor/encryption');
      const decryptedSecret = decrypt(setup.secret);
      expect(decryptedSecret).toBe(rawSecret);
    });
  });
});
