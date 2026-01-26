/**
 * @file backup-encryption.test.ts
 * @description Unit tests for backup encryption and redaction functionality
 */

import {
  encryptBackup,
  decryptBackup,
  redactSensitiveUserData,
  redactSensitiveOrgData,
  redactSensitiveTeamMemberData,
  redactBackupData,
  isBackupEncryptionConfigured,
  BackupEncryptionError,
  _testing,
} from '@/lib/security/backup-encryption';

// Mock logger
interface MockLogger {
  info: jest.Mock;
  warn: jest.Mock;
  error: jest.Mock;
  debug: jest.Mock;
  child: jest.Mock;
}

jest.mock('@/lib/core/log', () => {
  const mockLogger: MockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    child: jest.fn((): MockLogger => mockLogger),
  };
  return {
    __esModule: true,
    default: mockLogger,
  };
});

describe('Backup Encryption', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    // Set a valid encryption key for tests
    process.env.BACKUP_ENCRYPTION_KEY = 'a'.repeat(64); // 64 hex chars = 256-bit key
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('encryptBackup', () => {
    it('should encrypt data and return a Buffer', () => {
      const data = JSON.stringify({ test: 'data', number: 123 });
      const encrypted = encryptBackup(data);

      expect(Buffer.isBuffer(encrypted)).toBe(true);
      expect(encrypted.length).toBeGreaterThan(_testing.MIN_ENCRYPTED_SIZE);
    });

    it('should produce different ciphertext for same plaintext (unique IV/salt)', () => {
      const data = 'same data';
      const encrypted1 = encryptBackup(data);
      const encrypted2 = encryptBackup(data);

      // Encrypted buffers should be different due to unique salt and IV
      expect(encrypted1.equals(encrypted2)).toBe(false);
    });

    it('should throw BackupEncryptionError for empty string', () => {
      expect(() => encryptBackup('')).toThrow(BackupEncryptionError);
      expect(() => encryptBackup('')).toThrow('non-empty string');
    });

    it('should throw BackupEncryptionError for non-string input', () => {
      // @ts-expect-error Testing runtime validation
      expect(() => encryptBackup(null)).toThrow(BackupEncryptionError);
      // @ts-expect-error Testing runtime validation
      expect(() => encryptBackup(undefined)).toThrow(BackupEncryptionError);
      // @ts-expect-error Testing runtime validation
      expect(() => encryptBackup(123)).toThrow(BackupEncryptionError);
    });

    it('should encrypt large data successfully', () => {
      const largeData = 'x'.repeat(1024 * 1024); // 1MB of data
      const encrypted = encryptBackup(largeData);

      expect(Buffer.isBuffer(encrypted)).toBe(true);
      expect(encrypted.length).toBeGreaterThan(largeData.length);
    });

    it('should encrypt unicode and special characters', () => {
      const unicodeData = JSON.stringify({
        arabic: 'مرحبا',
        chinese: '你好',
        emoji: '🔐🔑',
        special: '<script>alert("xss")</script>',
      });
      const encrypted = encryptBackup(unicodeData);
      const decrypted = decryptBackup(encrypted);

      expect(decrypted).toBe(unicodeData);
    });
  });

  describe('decryptBackup', () => {
    it('should decrypt encrypted data correctly', () => {
      const originalData = JSON.stringify({
        users: [{ id: 1, name: 'Test User' }],
        organizations: [{ id: 'org-1', name: 'Test Org' }],
      });

      const encrypted = encryptBackup(originalData);
      const decrypted = decryptBackup(encrypted);

      expect(decrypted).toBe(originalData);
    });

    it('should throw BackupEncryptionError for non-Buffer input', () => {
      // @ts-expect-error Testing runtime validation
      expect(() => decryptBackup(null)).toThrow(BackupEncryptionError);
      // @ts-expect-error Testing runtime validation
      expect(() => decryptBackup('string')).toThrow(BackupEncryptionError);
      // @ts-expect-error Testing runtime validation
      expect(() => decryptBackup({})).toThrow(BackupEncryptionError);
    });

    it('should throw BackupEncryptionError for buffer too small', () => {
      const tooSmall = Buffer.alloc(32); // Less than MIN_ENCRYPTED_SIZE (64)

      expect(() => decryptBackup(tooSmall)).toThrow(BackupEncryptionError);
      expect(() => decryptBackup(tooSmall)).toThrow('too small');
    });

    it('should throw BackupEncryptionError for corrupted data', () => {
      const data = 'test data';
      const encrypted = encryptBackup(data);

      // Corrupt the ciphertext
      encrypted[encrypted.length - 1] ^= 0xff;

      expect(() => decryptBackup(encrypted)).toThrow(BackupEncryptionError);
    });

    it('should throw BackupEncryptionError for tampered auth tag', () => {
      const data = 'test data';
      const encrypted = encryptBackup(data);

      // Tamper with the auth tag (bytes 48-64)
      encrypted[50] ^= 0xff;

      expect(() => decryptBackup(encrypted)).toThrow(BackupEncryptionError);
    });

    it('should handle minimum valid encrypted buffer', () => {
      const minData = 'x'; // Single character
      const encrypted = encryptBackup(minData);
      const decrypted = decryptBackup(encrypted);

      expect(decrypted).toBe(minData);
    });
  });

  describe('Key Management', () => {
    // Helper to set NODE_ENV (readonly in TS but writable at runtime)
    const setNodeEnv = (value: string) => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value,
        writable: true,
        configurable: true,
      });
    };

    it('should throw error in production without BACKUP_ENCRYPTION_KEY', () => {
      delete process.env.BACKUP_ENCRYPTION_KEY;
      setNodeEnv('production');

      expect(() => encryptBackup('test')).toThrow(BackupEncryptionError);
      expect(() => encryptBackup('test')).toThrow('required in production');
    });

    it('should use NEXTAUTH_SECRET as fallback in development', () => {
      delete process.env.BACKUP_ENCRYPTION_KEY;
      setNodeEnv('development');
      process.env.NEXTAUTH_SECRET = 'dev-secret-key-at-least-32-chars';

      const data = 'test data';
      const encrypted = encryptBackup(data);
      const decrypted = decryptBackup(encrypted);

      expect(decrypted).toBe(data);
    });

    it('should throw error when neither key is set', () => {
      delete process.env.BACKUP_ENCRYPTION_KEY;
      delete process.env.NEXTAUTH_SECRET;
      setNodeEnv('development');

      expect(() => encryptBackup('test')).toThrow(BackupEncryptionError);
      expect(() => encryptBackup('test')).toThrow('NEXTAUTH_SECRET must be set');
    });

    it('should throw error for key that is too short', () => {
      process.env.BACKUP_ENCRYPTION_KEY = 'short'; // Less than 32 chars

      expect(() => encryptBackup('test')).toThrow(BackupEncryptionError);
      expect(() => encryptBackup('test')).toThrow('too short');
    });

    it('should accept key of exactly minimum length', () => {
      process.env.BACKUP_ENCRYPTION_KEY = 'a'.repeat(32); // Exactly 32 chars

      const data = 'test data';
      const encrypted = encryptBackup(data);
      const decrypted = decryptBackup(encrypted);

      expect(decrypted).toBe(data);
    });
  });

  describe('Round-trip Encryption', () => {
    it('should correctly round-trip JSON backup data', () => {
      const backupData = {
        metadata: {
          version: '4.0',
          type: 'full',
          createdAt: new Date().toISOString(),
        },
        users: [
          { id: 'user-1', email: 'test@example.com', name: 'Test User' },
        ],
        organizations: [
          { id: 'org-1', name: 'Test Org', slug: 'test-org' },
        ],
        assets: [
          { id: 'asset-1', name: 'Laptop', tenantId: 'org-1' },
        ],
      };

      const jsonData = JSON.stringify(backupData);
      const encrypted = encryptBackup(jsonData);
      const decrypted = decryptBackup(encrypted);
      const parsed = JSON.parse(decrypted);

      expect(parsed).toEqual(backupData);
    });

    it('should preserve exact whitespace and formatting', () => {
      const formattedJson = JSON.stringify({ test: 'data' }, null, 2);
      const encrypted = encryptBackup(formattedJson);
      const decrypted = decryptBackup(encrypted);

      expect(decrypted).toBe(formattedJson);
    });
  });
});

describe('Data Redaction', () => {
  describe('redactSensitiveUserData', () => {
    it('should redact password hash', () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: '$2a$10$hashedpassword',
      };

      const redacted = redactSensitiveUserData(user);

      expect(redacted.passwordHash).toBe('[REDACTED]');
      expect(redacted.id).toBe('user-1');
      expect(redacted.email).toBe('test@example.com');
    });

    it('should redact all sensitive user fields', () => {
      const user = {
        id: 'user-1',
        passwordHash: 'hash',
        twoFactorSecret: 'secret',
        twoFactorBackupCodes: ['code1', 'code2'],
        resetToken: 'token',
        resetTokenExpiry: new Date(),
        setupToken: 'setup-token',
        setupTokenExpiry: new Date(),
      };

      const redacted = redactSensitiveUserData(user);

      for (const field of _testing.SENSITIVE_USER_FIELDS) {
        expect(redacted[field]).toBe('[REDACTED]');
      }
    });

    it('should not redact null/undefined values', () => {
      const user = {
        id: 'user-1',
        passwordHash: null,
        twoFactorSecret: undefined,
      };

      const redacted = redactSensitiveUserData(user);

      expect(redacted.passwordHash).toBeNull();
      expect(redacted.twoFactorSecret).toBeUndefined();
    });

    it('should preserve non-sensitive fields', () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date(),
        passwordHash: 'hash',
      };

      const redacted = redactSensitiveUserData(user);

      expect(redacted.id).toBe(user.id);
      expect(redacted.email).toBe(user.email);
      expect(redacted.name).toBe(user.name);
      expect(redacted.createdAt).toBe(user.createdAt);
    });

    it('should return a new object (not mutate original)', () => {
      const user = { id: 'user-1', passwordHash: 'hash' };
      const redacted = redactSensitiveUserData(user);

      expect(redacted).not.toBe(user);
      expect(user.passwordHash).toBe('hash'); // Original unchanged
    });
  });

  describe('redactSensitiveOrgData', () => {
    it('should redact OAuth secrets', () => {
      const org = {
        id: 'org-1',
        name: 'Test Org',
        googleClientSecret: 'google-secret',
        azureClientSecret: 'azure-secret',
      };

      const redacted = redactSensitiveOrgData(org);

      expect(redacted.googleClientSecret).toBe('[REDACTED]');
      expect(redacted.azureClientSecret).toBe('[REDACTED]');
      expect(redacted.name).toBe('Test Org');
    });

    it('should not redact null/undefined OAuth secrets', () => {
      const org = {
        id: 'org-1',
        googleClientSecret: null,
        azureClientSecret: undefined,
      };

      const redacted = redactSensitiveOrgData(org);

      expect(redacted.googleClientSecret).toBeNull();
      expect(redacted.azureClientSecret).toBeUndefined();
    });
  });

  describe('redactSensitiveTeamMemberData', () => {
    it('should redact financial and PII fields', () => {
      const member = {
        id: 'tm-1',
        name: 'John Doe',
        bankAccountNumber: '1234567890',
        bankRoutingNumber: '987654321',
        nationalId: 'ID12345',
        taxId: 'TAX123',
        socialSecurityNumber: '123-45-6789',
        passportNumber: 'P123456',
      };

      const redacted = redactSensitiveTeamMemberData(member);

      for (const field of _testing.SENSITIVE_TEAM_MEMBER_FIELDS) {
        expect(redacted[field]).toBe('[REDACTED]');
      }
      expect(redacted.name).toBe('John Doe');
    });
  });

  describe('redactBackupData', () => {
    it('should redact all sensitive data in full backup', () => {
      const backupData = {
        users: [
          { id: 'user-1', passwordHash: 'hash1' },
          { id: 'user-2', passwordHash: 'hash2', twoFactorSecret: 'secret' },
        ],
        organizations: [
          { id: 'org-1', googleClientSecret: 'secret1' },
          { id: 'org-2', azureClientSecret: 'secret2' },
        ],
        teamMembers: [
          { id: 'tm-1', bankAccountNumber: '123456' },
        ],
        assets: [
          { id: 'asset-1', name: 'Laptop' },
        ],
      };

      const redacted = redactBackupData(backupData);

      expect(redacted.users![0].passwordHash).toBe('[REDACTED]');
      expect(redacted.users![1].passwordHash).toBe('[REDACTED]');
      expect(redacted.users![1].twoFactorSecret).toBe('[REDACTED]');
      expect(redacted.organizations![0].googleClientSecret).toBe('[REDACTED]');
      expect(redacted.organizations![1].azureClientSecret).toBe('[REDACTED]');
      expect(redacted.teamMembers![0].bankAccountNumber).toBe('[REDACTED]');
      // Non-sensitive data preserved
      expect(redacted.assets).toEqual(backupData.assets);
    });

    it('should handle single organization format', () => {
      const backupData = {
        organization: { id: 'org-1', googleClientSecret: 'secret' },
        assets: [],
      };

      const redacted = redactBackupData(backupData);

      expect(redacted.organization!.googleClientSecret).toBe('[REDACTED]');
    });

    it('should handle missing arrays gracefully', () => {
      const backupData = {
        metadata: { version: '4.0' },
      };

      const redacted = redactBackupData(backupData);

      expect(redacted).toEqual(backupData);
    });

    it('should not mutate original data', () => {
      const backupData = {
        users: [{ id: 'user-1', passwordHash: 'hash' }],
      };

      const redacted = redactBackupData(backupData);

      expect(redacted).not.toBe(backupData);
      expect(backupData.users[0].passwordHash).toBe('hash'); // Original unchanged
    });
  });
});

describe('isBackupEncryptionConfigured', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return true when BACKUP_ENCRYPTION_KEY is set', () => {
    process.env.BACKUP_ENCRYPTION_KEY = 'key';
    delete process.env.NEXTAUTH_SECRET;

    expect(isBackupEncryptionConfigured()).toBe(true);
  });

  it('should return true when NEXTAUTH_SECRET is set', () => {
    delete process.env.BACKUP_ENCRYPTION_KEY;
    process.env.NEXTAUTH_SECRET = 'secret';

    expect(isBackupEncryptionConfigured()).toBe(true);
  });

  it('should return true when both are set', () => {
    process.env.BACKUP_ENCRYPTION_KEY = 'key';
    process.env.NEXTAUTH_SECRET = 'secret';

    expect(isBackupEncryptionConfigured()).toBe(true);
  });

  it('should return false when neither is set', () => {
    delete process.env.BACKUP_ENCRYPTION_KEY;
    delete process.env.NEXTAUTH_SECRET;

    expect(isBackupEncryptionConfigured()).toBe(false);
  });

  it('should return false for empty strings', () => {
    process.env.BACKUP_ENCRYPTION_KEY = '';
    process.env.NEXTAUTH_SECRET = '';

    expect(isBackupEncryptionConfigured()).toBe(false);
  });
});

describe('Security Properties', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.BACKUP_ENCRYPTION_KEY = 'a'.repeat(64);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should produce authenticated ciphertext (GCM mode)', () => {
    // GCM provides both confidentiality and authenticity
    const data = 'sensitive data';
    const encrypted = encryptBackup(data);

    // Attempt to tamper with ciphertext
    encrypted[encrypted.length - 10] ^= 0xff;

    // Decryption should fail due to authentication
    expect(() => decryptBackup(encrypted)).toThrow(BackupEncryptionError);
  });

  it('should use unique IV for each encryption', () => {
    const data = 'test';
    const encrypted1 = encryptBackup(data);
    const encrypted2 = encryptBackup(data);

    // Extract IVs (bytes 32-48)
    const iv1 = encrypted1.subarray(32, 48);
    const iv2 = encrypted2.subarray(32, 48);

    expect(iv1.equals(iv2)).toBe(false);
  });

  it('should use unique salt for each encryption', () => {
    const data = 'test';
    const encrypted1 = encryptBackup(data);
    const encrypted2 = encryptBackup(data);

    // Extract salts (bytes 0-32)
    const salt1 = encrypted1.subarray(0, 32);
    const salt2 = encrypted2.subarray(0, 32);

    expect(salt1.equals(salt2)).toBe(false);
  });

  it('should have proper buffer format', () => {
    const data = 'test';
    const encrypted = encryptBackup(data);

    // Format: salt (32) + iv (16) + authTag (16) + ciphertext
    expect(encrypted.length).toBeGreaterThanOrEqual(64);

    // Salt should be 32 bytes
    const salt = encrypted.subarray(0, 32);
    expect(salt.length).toBe(32);

    // IV should be 16 bytes
    const iv = encrypted.subarray(32, 48);
    expect(iv.length).toBe(16);

    // Auth tag should be 16 bytes
    const authTag = encrypted.subarray(48, 64);
    expect(authTag.length).toBe(16);
  });
});
