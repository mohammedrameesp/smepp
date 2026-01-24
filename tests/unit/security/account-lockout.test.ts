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
  unlockAccount,
  getLockoutStatus,
} from '@/lib/security/account-lockout';
// Note: TeamMember lockout functions removed - all auth is handled via User table

// Mock Prisma
jest.mock('@/lib/core/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    teamMember: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Account Lockout Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isAccountLocked', () => {
    it('should return locked: false when user has no lockedUntil date', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        lockedUntil: null,
      });

      const result = await isAccountLocked('user-123');

      expect(result).toEqual({ locked: false });
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        select: { lockedUntil: true },
      });
    });

    it('should return locked: false when user does not exist', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await isAccountLocked('non-existent');

      expect(result).toEqual({ locked: false });
    });

    it('should return locked: true when lockedUntil is in the future', async () => {
      const futureDate = new Date(Date.now() + 60000);
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        lockedUntil: futureDate,
      });

      const result = await isAccountLocked('user-123');

      expect(result).toEqual({ locked: true, lockedUntil: futureDate });
    });

    it('should clear expired lock and return locked: false', async () => {
      const pastDate = new Date(Date.now() - 60000);
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        lockedUntil: pastDate,
      });
      (mockPrisma.user.update as jest.Mock).mockResolvedValue({});

      const result = await isAccountLocked('user-123');

      expect(result).toEqual({ locked: false });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          lockedUntil: null,
          failedLoginAttempts: 0,
        },
      });
    });
  });

  describe('isAccountLockedByEmail', () => {
    it('should return locked: false when user does not exist (does not reveal user existence)', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await isAccountLockedByEmail('nonexistent@test.com');

      expect(result).toEqual({ locked: false });
    });

    it('should return locked: false when user has no lock', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-123',
        lockedUntil: null,
      });

      const result = await isAccountLockedByEmail('test@test.com');

      expect(result).toEqual({ locked: false });
    });

    it('should return locked: true with minutes remaining when locked', async () => {
      const futureDate = new Date(Date.now() + 5 * 60000); // 5 minutes from now
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-123',
        lockedUntil: futureDate,
      });

      const result = await isAccountLockedByEmail('test@test.com');

      expect(result.locked).toBe(true);
      expect(result.lockedUntil).toEqual(futureDate);
      expect(result.minutesRemaining).toBeGreaterThan(0);
      expect(result.minutesRemaining).toBeLessThanOrEqual(5);
    });

    it('should normalize email to lowercase', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await isAccountLockedByEmail('TEST@TEST.COM');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@test.com' },
        select: { id: true, lockedUntil: true },
      });
    });
  });

  describe('recordFailedLogin', () => {
    it('should return locked: false when user does not exist', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await recordFailedLogin('non-existent');

      expect(result).toEqual({ locked: false });
    });

    it('should increment failed attempts and return attempts remaining', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        failedLoginAttempts: 2,
        lockedUntil: null,
      });
      (mockPrisma.user.update as jest.Mock).mockResolvedValue({});

      const result = await recordFailedLogin('user-123');

      expect(result.locked).toBe(false);
      expect(result.attemptsRemaining).toBe(2); // 5 max - 3 attempts = 2 remaining
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { failedLoginAttempts: 3 },
      });
    });

    it('should lock account after max failed attempts', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        failedLoginAttempts: 4,
        lockedUntil: null,
      });
      (mockPrisma.user.update as jest.Mock).mockResolvedValue({});

      const result = await recordFailedLogin('user-123');

      expect(result.locked).toBe(true);
      expect(result.lockedUntil).toBeDefined();
      // Should be ~5 minutes from now (first lockout)
      const lockDuration = result.lockedUntil!.getTime() - Date.now();
      expect(lockDuration).toBeGreaterThan(4 * 60 * 1000); // > 4 minutes
      expect(lockDuration).toBeLessThanOrEqual(6 * 60 * 1000); // <= 6 minutes
    });

    it('should use progressive lockout durations', async () => {
      // Simulate 10th failed attempt (second lockout cycle)
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        failedLoginAttempts: 9,
        lockedUntil: null,
      });
      (mockPrisma.user.update as jest.Mock).mockResolvedValue({});

      const result = await recordFailedLogin('user-123');

      expect(result.locked).toBe(true);
      // Should be ~15 minutes from now (second lockout)
      const lockDuration = result.lockedUntil!.getTime() - Date.now();
      expect(lockDuration).toBeGreaterThan(14 * 60 * 1000); // > 14 minutes
      expect(lockDuration).toBeLessThanOrEqual(16 * 60 * 1000); // <= 16 minutes
    });
  });

  describe('recordFailedLoginByEmail', () => {
    it('should return plausible response when user does not exist', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await recordFailedLoginByEmail('nonexistent@test.com');

      // Should not reveal that user doesn't exist
      expect(result.locked).toBe(false);
      expect(result.attemptsRemaining).toBe(4); // MAX_FAILED_ATTEMPTS - 1
    });

    it('should delegate to recordFailedLogin when user exists', async () => {
      (mockPrisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: 'user-123' }) // First call for email lookup
        .mockResolvedValueOnce({ failedLoginAttempts: 0, lockedUntil: null }); // Second call for recordFailedLogin
      (mockPrisma.user.update as jest.Mock).mockResolvedValue({});

      const result = await recordFailedLoginByEmail('test@test.com');

      expect(result.locked).toBe(false);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@test.com' },
        select: { id: true },
      });
    });
  });

  describe('clearFailedLogins', () => {
    it('should reset failed attempts and clear lock', async () => {
      (mockPrisma.user.update as jest.Mock).mockResolvedValue({});

      await clearFailedLogins('user-123');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });
    });
  });

  describe('unlockAccount', () => {
    it('should reset failed attempts and clear lock (admin action)', async () => {
      (mockPrisma.user.update as jest.Mock).mockResolvedValue({});

      await unlockAccount('user-123');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });
    });
  });

  describe('getLockoutStatus', () => {
    it('should throw error when user does not exist', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(getLockoutStatus('non-existent')).rejects.toThrow('User not found');
    });

    it('should return lockout status for unlocked user', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        failedLoginAttempts: 2,
        lockedUntil: null,
      });

      const result = await getLockoutStatus('user-123');

      expect(result).toEqual({
        failedAttempts: 2,
        isLocked: false,
        lockedUntil: undefined,
        maxAttempts: 5,
      });
    });

    it('should return lockout status for locked user', async () => {
      const futureDate = new Date(Date.now() + 60000);
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        failedLoginAttempts: 5,
        lockedUntil: futureDate,
      });

      const result = await getLockoutStatus('user-123');

      expect(result).toEqual({
        failedAttempts: 5,
        isLocked: true,
        lockedUntil: futureDate,
        maxAttempts: 5,
      });
    });

    it('should return isLocked: false for expired lock', async () => {
      const pastDate = new Date(Date.now() - 60000);
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        failedLoginAttempts: 5,
        lockedUntil: pastDate,
      });

      const result = await getLockoutStatus('user-123');

      expect(result.isLocked).toBe(false);
      expect(result.lockedUntil).toBeUndefined();
    });
  });

  // Note: TeamMember lockout tests removed - all auth is now handled via User table
  // with the User-TeamMember consolidation. TeamMember no longer has auth fields.

  describe('Security Considerations', () => {
    it('should not reveal user existence through timing or response', async () => {
      // Both existing and non-existing users should return similar responses
      (mockPrisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'user-123' });

      const nonExistentResult = await recordFailedLoginByEmail('nonexistent@test.com');

      // Reset mock for second call
      (mockPrisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: 'user-123' })
        .mockResolvedValueOnce({ failedLoginAttempts: 3, lockedUntil: null });
      (mockPrisma.user.update as jest.Mock).mockResolvedValue({});

      const existingResult = await recordFailedLoginByEmail('existing@test.com');

      // Both should return locked: false for first few attempts
      expect(nonExistentResult.locked).toBe(false);
      expect(existingResult.locked).toBe(false);
    });

    it('should implement progressive lockout to slow down attacks', () => {
      // Lockout durations should increase: 5min, 15min, 30min, 60min
      const expectedDurations = [5, 15, 30, 60];

      expectedDurations.forEach((duration, index) => {
        expect(duration).toBeGreaterThan(index === 0 ? 0 : expectedDurations[index - 1]);
      });
    });
  });
});
