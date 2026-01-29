/**
 * @file encryption.test.ts
 * @description Unit tests for two-factor authentication encryption
 * @module two-factor
 */

import { encrypt, decrypt, generateEncryptionKey } from '@/lib/two-factor/encryption';

// Store original env vars
const originalEnv = process.env;

describe('Encryption', () => {
  beforeEach(() => {
    // Reset env vars before each test
    jest.resetModules();
    process.env = { ...originalEnv };
    // Ensure we have a valid NEXTAUTH_SECRET for dev mode
    process.env.NEXTAUTH_SECRET = 'test-secret-for-unit-tests-must-be-long-enough';
    process.env.NODE_ENV = 'test';
  });

  afterAll(() => {
    // Restore original env vars
    process.env = originalEnv;
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt a string correctly (round-trip)', () => {
      const originalText = 'JBSWY3DPEHPK3PXP';
      const encrypted = encrypt(originalText);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(originalText);
    });

    it('should produce different ciphertext for same plaintext (random IV)', () => {
      const text = 'test-secret';
      const encrypted1 = encrypt(text);
      const encrypted2 = encrypt(text);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should both encrypt correctly when called multiple times', () => {
      const text = 'test-secret';
      const encrypted1 = encrypt(text);
      const encrypted2 = encrypt(text);

      expect(decrypt(encrypted1)).toBe(text);
      expect(decrypt(encrypted2)).toBe(text);
    });

    it('should handle empty string', () => {
      const text = '';
      const encrypted = encrypt(text);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(text);
    });

    it('should handle long strings', () => {
      const text = 'A'.repeat(1000);
      const encrypted = encrypt(text);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(text);
    });

    it('should handle special characters', () => {
      const text = 'Special chars: !@#$%^&*()_+-=[]{}|;:",.<>?/~`';
      const encrypted = encrypt(text);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(text);
    });

    it('should handle unicode characters', () => {
      const text = 'Unicode: 你好世界 🔐 مرحبا العالم';
      const encrypted = encrypt(text);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(text);
    });

    it('should produce hex-encoded output', () => {
      const text = 'test';
      const encrypted = encrypt(text);

      // Should only contain hex characters
      expect(encrypted).toMatch(/^[0-9a-f]+$/i);
    });

    it('should produce output with expected length components', () => {
      const text = 'test';
      const encrypted = encrypt(text);

      // IV (16 bytes = 32 hex chars) + AuthTag (16 bytes = 32 hex chars) + ciphertext
      expect(encrypted.length).toBeGreaterThanOrEqual(64);
    });
  });

  describe('Tampering Detection', () => {
    it('should fail decryption if ciphertext is modified', () => {
      const text = 'sensitive-data';
      const encrypted = encrypt(text);

      // Modify the last character of the ciphertext (after IV and auth tag)
      const modifiedEncrypted =
        encrypted.slice(0, -2) +
        (encrypted.slice(-2) === '00' ? 'ff' : '00');

      expect(() => decrypt(modifiedEncrypted)).toThrow();
    });

    it('should fail decryption if IV is modified', () => {
      const text = 'sensitive-data';
      const encrypted = encrypt(text);

      // Modify the first byte of IV
      const modifiedIV =
        (encrypted.slice(0, 2) === '00' ? 'ff' : '00') + encrypted.slice(2);

      expect(() => decrypt(modifiedIV)).toThrow();
    });

    it('should fail decryption if auth tag is modified', () => {
      const text = 'sensitive-data';
      const encrypted = encrypt(text);

      // Auth tag is at position 32-64 (after 16-byte IV)
      const ivPart = encrypted.slice(0, 32);
      const authTagPart = encrypted.slice(32, 64);
      const ciphertextPart = encrypted.slice(64);

      // Modify auth tag
      const modifiedAuthTag =
        authTagPart.slice(0, -2) +
        (authTagPart.slice(-2) === '00' ? 'ff' : '00');

      const modifiedEncrypted = ivPart + modifiedAuthTag + ciphertextPart;

      expect(() => decrypt(modifiedEncrypted)).toThrow();
    });

    it('should fail decryption with truncated ciphertext', () => {
      const text = 'sensitive-data';
      const encrypted = encrypt(text);

      // Truncate the ciphertext
      const truncated = encrypted.slice(0, 64); // Only IV + auth tag

      expect(() => decrypt(truncated)).toThrow();
    });

    it('should fail decryption with appended data', () => {
      const text = 'sensitive-data';
      const encrypted = encrypt(text);

      // Append extra data
      const appended = encrypted + 'extra';

      expect(() => decrypt(appended)).toThrow();
    });
  });

  describe('generateEncryptionKey', () => {
    it('should generate a 64-character hex string', () => {
      const key = generateEncryptionKey();

      expect(key).toHaveLength(64);
      expect(key).toMatch(/^[0-9a-f]+$/);
    });

    it('should generate different keys on each call', () => {
      const key1 = generateEncryptionKey();
      const key2 = generateEncryptionKey();

      expect(key1).not.toBe(key2);
    });

    it('should generate cryptographically random keys', () => {
      // Generate multiple keys and verify they are all different
      const keys = new Set<string>();
      for (let i = 0; i < 100; i++) {
        keys.add(generateEncryptionKey());
      }

      expect(keys.size).toBe(100);
    });
  });

  describe('Key Validation', () => {
    it('should generate valid 64-character encryption keys', () => {
      const key = generateEncryptionKey();
      expect(key).toHaveLength(64);
      expect(key).toMatch(/^[0-9a-f]+$/);
    });

    it('should encrypt and decrypt with derived key from NEXTAUTH_SECRET', () => {
      // The default test setup uses NEXTAUTH_SECRET-derived key
      const text = 'test-data';
      const encrypted = encrypt(text);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(text);
    });
  });

  describe('Key Rotation Strategy', () => {
    it('should demonstrate key rotation concept with encrypt/decrypt pairs', () => {
      // Key rotation requires:
      // 1. Decrypt existing data with old key
      // 2. Re-encrypt with new key
      // 3. Update database

      // This test verifies the encrypt/decrypt round-trip that makes this possible
      const originalData = 'totp-secret-12345';

      // Encrypt data
      const encrypted = encrypt(originalData);

      // Decrypt data (simulating step 1 of rotation)
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(originalData);

      // Re-encrypt (simulating step 2 of rotation)
      const reEncrypted = encrypt(decrypted);
      expect(reEncrypted).not.toBe(encrypted); // Different IV

      // Verify re-encrypted data is valid
      expect(decrypt(reEncrypted)).toBe(originalData);
    });

    it('should produce different ciphertexts enabling secure key rotation', () => {
      // When rotating keys, the same plaintext encrypted with different IVs
      // produces different ciphertexts, which is correct behavior
      const data = 'JBSWY3DPEHPK3PXP';

      const encrypted1 = encrypt(data);
      const encrypted2 = encrypt(data);

      // Different ciphertexts (due to random IV)
      expect(encrypted1).not.toBe(encrypted2);

      // Both decrypt to same value
      expect(decrypt(encrypted1)).toBe(data);
      expect(decrypt(encrypted2)).toBe(data);
    });

    it('should maintain data integrity through multiple encrypt/decrypt cycles', () => {
      const testSecrets = [
        'JBSWY3DPEHPK3PXP',
        'GEZDGNBVGY3TQOJQ',
        'MFRGGZDFMY4TQMJQ',
      ];

      // Simulate multiple rotation cycles
      testSecrets.forEach((secret) => {
        let currentEncrypted = encrypt(secret);

        for (let cycle = 0; cycle < 3; cycle++) {
          // Decrypt and re-encrypt (simulating key rotation)
          const decrypted = decrypt(currentEncrypted);
          expect(decrypted).toBe(secret);
          currentEncrypted = encrypt(decrypted);
        }

        // Final verification
        expect(decrypt(currentEncrypted)).toBe(secret);
      });
    });
  });

  describe('Environment Configuration', () => {
    it('should work with NEXTAUTH_SECRET derived key in test environment', () => {
      // The test setup uses NEXTAUTH_SECRET for key derivation
      const text = 'test-in-dev';
      const encrypted = encrypt(text);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(text);
    });

    it('should consistently encrypt/decrypt across multiple calls', () => {
      // Verify the derived key is stable
      const text = 'consistent-test';

      const encrypted1 = encrypt(text);
      const encrypted2 = encrypt(text);

      // Should produce different ciphertexts (random IV) but same plaintext
      expect(encrypted1).not.toBe(encrypted2);
      expect(decrypt(encrypted1)).toBe(text);
      expect(decrypt(encrypted2)).toBe(text);
    });
  });
});
