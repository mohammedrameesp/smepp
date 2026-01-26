/**
 * @file account-lockout.test.ts
 * @description Tests for account lockout protection against brute-force attacks
 */

import { prisma } from '@/lib/core/prisma';
import {
  isAccountLocked,
  isAccountLockedByEmail,
  recordFailedLogin,
  recordFailedLoginByEmail,
  clearFailedLogins,
  adminUnlockAccount,
  getAccountLockoutStatus,
  _testExports,
} from '@/lib/security/account-lockout';

// Mock Prisma
jest.mock('@/lib/core/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// Mock logger to suppress output during tests
jest.mock('@/lib/core/log', () => {
  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    child: jest.fn(() => mockLogger),
  };
  return {
    __esModule: true,
    default: mockLogger,
  };
});

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

// Use valid user IDs (>= 5 characters as per validation)
const VALID_USER_ID = 'user-123456789';
const VALID_ADMIN_ID = 'admin-123456789';
const VALID_EMAIL = 'test@example.com';

describe('Account Lockout Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Configuration', () => {
    it('should have correct default max failed attempts', () => {
      expect(_testExports.MAX_FAILED_ATTEMPTS).toBe(5);
    });

    it('should have correct default lockout durations', () => {
      expect(_testExports.LOCKOUT_DURATIONS_MINUTES).toEqual([5, 15, 30, 60]);
    });
  });

  describe('isAccountLocked', () => {
    it('should return locked: false when user has no lockedUntil date', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        lockedUntil: null,
      });

      const result = await isAccountLocked(VALID_USER_ID);

      expect(result).toEqual({ locked: false });
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: VALID_USER_ID },
        select: { lockedUntil: true },
      });
    });

    it('should return locked: false when user does not exist', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await isAccountLocked(VALID_USER_ID);

      expect(result).toEqual({ locked: false });
    });

    it('should return locked: true with minutesRemaining when lockedUntil is in the future', async () => {
      const futureDate = new Date(Date.now() + 5 * 60000); // 5 minutes from now
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        lockedUntil: futureDate,
      });

      const result = await isAccountLocked(VALID_USER_ID);

      expect(result.locked).toBe(true);
      expect(result.lockedUntil).toEqual(futureDate);
      expect(result.minutesRemaining).toBeGreaterThan(0);
      expect(result.minutesRemaining).toBeLessThanOrEqual(5);
    });

    it('should clear expired lock and return locked: false', async () => {
      const pastDate = new Date(Date.now() - 60000);
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        lockedUntil: pastDate,
      });
      (mockPrisma.user.update as jest.Mock).mockResolvedValue({});

      const result = await isAccountLocked(VALID_USER_ID);

      expect(result).toEqual({ locked: false });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: VALID_USER_ID },
        data: {
          lockedUntil: null,
          failedLoginAttempts: 0,
        },
      });
    });

    it('should return locked: false for invalid userId', async () => {
      const result = await isAccountLocked('ab'); // Too short

      expect(result).toEqual({ locked: false });
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should return locked: false on database error', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('DB error'));

      const result = await isAccountLocked(VALID_USER_ID);

      expect(result).toEqual({ locked: false });
    });
  });

  describe('isAccountLockedByEmail', () => {
    it('should return locked: false when user does not exist (does not reveal user existence)', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await isAccountLockedByEmail(VALID_EMAIL);

      expect(result).toEqual({ locked: false });
    });

    it('should return locked: false when user has no lock', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: VALID_USER_ID,
        lockedUntil: null,
      });

      const result = await isAccountLockedByEmail(VALID_EMAIL);

      expect(result).toEqual({ locked: false });
    });

    it('should return locked: true with minutes remaining when locked', async () => {
      const futureDate = new Date(Date.now() + 5 * 60000); // 5 minutes from now
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: VALID_USER_ID,
        lockedUntil: futureDate,
      });

      const result = await isAccountLockedByEmail(VALID_EMAIL);

      expect(result.locked).toBe(true);
      expect(result.lockedUntil).toEqual(futureDate);
      expect(result.minutesRemaining).toBeGreaterThan(0);
      expect(result.minutesRemaining).toBeLessThanOrEqual(5);
    });

    it('should normalize email to lowercase', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await isAccountLockedByEmail('TEST@EXAMPLE.COM');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        select: { id: true, lockedUntil: true },
      });
    });

    it('should return locked: false for invalid email', async () => {
      const result = await isAccountLockedByEmail('invalid');

      expect(result).toEqual({ locked: false });
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('recordFailedLogin', () => {
    it('should return locked: false when user does not exist', async () => {
      (mockPrisma.user.update as jest.Mock).mockRejectedValue(
        new Error('Record to update not found')
      );

      const result = await recordFailedLogin(VALID_USER_ID);

      expect(result.locked).toBe(false);
    });

    it('should increment failed attempts using atomic update and return attempts remaining', async () => {
      // Mock the atomic increment update - returns the new value
      (mockPrisma.user.update as jest.Mock).mockResolvedValue({
        failedLoginAttempts: 3, // After increment from 2
        lockedUntil: null,
        email: VALID_EMAIL,
      });

      const result = await recordFailedLogin(VALID_USER_ID);

      expect(result.locked).toBe(false);
      expect(result.attemptsRemaining).toBe(2); // 5 max - 3 attempts = 2 remaining
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: VALID_USER_ID },
        data: { failedLoginAttempts: { increment: 1 } },
        select: { failedLoginAttempts: true, lockedUntil: true, email: true },
      });
    });

    it('should lock account after max failed attempts', async () => {
      // First update returns 5 failed attempts (triggers lock)
      (mockPrisma.user.update as jest.Mock)
        .mockResolvedValueOnce({
          failedLoginAttempts: 5,
          lockedUntil: null,
          email: VALID_EMAIL,
        })
        .mockResolvedValueOnce({}); // Lock update

      const result = await recordFailedLogin(VALID_USER_ID);

      expect(result.locked).toBe(true);
      expect(result.lockedUntil).toBeDefined();
      // Should be ~5 minutes from now (first lockout)
      const lockDuration = result.lockedUntil!.getTime() - Date.now();
      expect(lockDuration).toBeGreaterThan(4 * 60 * 1000); // > 4 minutes
      expect(lockDuration).toBeLessThanOrEqual(6 * 60 * 1000); // <= 6 minutes
    });

    it('should use progressive lockout durations', async () => {
      // Simulate 10th failed attempt (second lockout cycle)
      (mockPrisma.user.update as jest.Mock)
        .mockResolvedValueOnce({
          failedLoginAttempts: 10,
          lockedUntil: null,
          email: VALID_EMAIL,
        })
        .mockResolvedValueOnce({});

      const result = await recordFailedLogin(VALID_USER_ID);

      expect(result.locked).toBe(true);
      // Should be ~15 minutes from now (second lockout)
      const lockDuration = result.lockedUntil!.getTime() - Date.now();
      expect(lockDuration).toBeGreaterThan(14 * 60 * 1000); // > 14 minutes
      expect(lockDuration).toBeLessThanOrEqual(16 * 60 * 1000); // <= 16 minutes
    });

    it('should return locked: false for invalid userId', async () => {
      const result = await recordFailedLogin('ab'); // Too short

      expect(result.locked).toBe(false);
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('recordFailedLoginByEmail', () => {
    it('should return plausible response when user does not exist', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await recordFailedLoginByEmail('nonexistent@example.com');

      // Should not reveal that user doesn't exist
      expect(result.locked).toBe(false);
      expect(result.attemptsRemaining).toBe(4); // MAX_FAILED_ATTEMPTS - 1
    });

    it('should delegate to recordFailedLogin when user exists', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ id: VALID_USER_ID });
      (mockPrisma.user.update as jest.Mock).mockResolvedValue({
        failedLoginAttempts: 1,
        lockedUntil: null,
        email: VALID_EMAIL,
      });

      const result = await recordFailedLoginByEmail(VALID_EMAIL);

      expect(result.locked).toBe(false);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        select: { id: true },
      });
    });

    it('should return plausible response for invalid email', async () => {
      const result = await recordFailedLoginByEmail('invalid');

      expect(result.locked).toBe(false);
      expect(result.attemptsRemaining).toBe(4);
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('clearFailedLogins', () => {
    it('should reset failed attempts and clear lock', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        failedLoginAttempts: 3,
        lockedUntil: new Date(),
      });
      (mockPrisma.user.update as jest.Mock).mockResolvedValue({});

      await clearFailedLogins(VALID_USER_ID);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: VALID_USER_ID },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });
    });

    it('should not throw for invalid userId', async () => {
      await expect(clearFailedLogins('ab')).resolves.not.toThrow();
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('should not throw on database error', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        failedLoginAttempts: 1,
        lockedUntil: null,
      });
      (mockPrisma.user.update as jest.Mock).mockRejectedValue(new Error('DB error'));

      await expect(clearFailedLogins(VALID_USER_ID)).resolves.not.toThrow();
    });
  });

  describe('adminUnlockAccount', () => {
    it('should unlock a locked account and return wasLocked: true', async () => {
      const futureDate = new Date(Date.now() + 60000);
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        lockedUntil: futureDate,
        failedLoginAttempts: 5,
        email: VALID_EMAIL,
      });
      (mockPrisma.user.update as jest.Mock).mockResolvedValue({});

      const result = await adminUnlockAccount(VALID_USER_ID, VALID_ADMIN_ID);

      expect(result.success).toBe(true);
      expect(result.wasLocked).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: VALID_USER_ID },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });
    });

    it('should clear attempts on non-locked account and return wasLocked: false', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        lockedUntil: null,
        failedLoginAttempts: 2,
        email: VALID_EMAIL,
      });
      (mockPrisma.user.update as jest.Mock).mockResolvedValue({});

      const result = await adminUnlockAccount(VALID_USER_ID, VALID_ADMIN_ID);

      expect(result.success).toBe(true);
      expect(result.wasLocked).toBe(false);
    });

    it('should return success: false for non-existent user', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await adminUnlockAccount(VALID_USER_ID, VALID_ADMIN_ID);

      expect(result.success).toBe(false);
      expect(result.wasLocked).toBe(false);
    });

    it('should return success: false for invalid inputs', async () => {
      const result = await adminUnlockAccount('ab', VALID_ADMIN_ID);

      expect(result.success).toBe(false);
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('getAccountLockoutStatus', () => {
    it('should return full lockout details for locked account', async () => {
      const futureDate = new Date(Date.now() + 5 * 60000);
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        failedLoginAttempts: 5,
        lockedUntil: futureDate,
      });

      const result = await getAccountLockoutStatus(VALID_USER_ID);

      expect(result).not.toBeNull();
      expect(result!.failedAttempts).toBe(5);
      expect(result!.isLocked).toBe(true);
      expect(result!.lockedUntil).toEqual(futureDate);
      expect(result!.minutesRemaining).toBeGreaterThan(0);
    });

    it('should return status for non-locked account', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        failedLoginAttempts: 2,
        lockedUntil: null,
      });

      const result = await getAccountLockoutStatus(VALID_USER_ID);

      expect(result).not.toBeNull();
      expect(result!.failedAttempts).toBe(2);
      expect(result!.isLocked).toBe(false);
      expect(result!.minutesRemaining).toBeNull();
    });

    it('should return null for non-existent user', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await getAccountLockoutStatus(VALID_USER_ID);

      expect(result).toBeNull();
    });

    it('should return null for invalid userId', async () => {
      const result = await getAccountLockoutStatus('ab');

      expect(result).toBeNull();
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('Security Considerations', () => {
    it('should not reveal user existence through response', async () => {
      // Both existing and non-existing users should return similar responses
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const nonExistentResult = await recordFailedLoginByEmail('nonexistent@example.com');

      expect(nonExistentResult.locked).toBe(false);
      expect(nonExistentResult.attemptsRemaining).toBeDefined();
    });

    it('should implement progressive lockout to slow down attacks', () => {
      // Lockout durations should increase: 5min, 15min, 30min, 60min
      const durations = _testExports.LOCKOUT_DURATIONS_MINUTES;

      durations.forEach((duration, index) => {
        expect(duration).toBeGreaterThan(index === 0 ? 0 : durations[index - 1]);
      });
    });

    it('should validate userId to prevent injection', () => {
      expect(_testExports.isValidUserId('ab')).toBe(false); // Too short
      expect(_testExports.isValidUserId('a'.repeat(51))).toBe(false); // Too long
      expect(_testExports.isValidUserId(VALID_USER_ID)).toBe(true);
    });

    it('should validate email to prevent injection', () => {
      expect(_testExports.isValidEmail('invalid')).toBe(false); // No @
      expect(_testExports.isValidEmail('ab')).toBe(false); // Too short
      expect(_testExports.isValidEmail(VALID_EMAIL)).toBe(true);
    });
  });
});
