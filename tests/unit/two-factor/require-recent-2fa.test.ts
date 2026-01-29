/**
 * @file require-recent-2fa.test.ts
 * @description Unit tests for two-factor authentication re-verification enforcement
 * @module two-factor
 */

import { checkRecent2FA, requireRecent2FA } from '@/lib/two-factor/require-recent-2fa';
import { prisma } from '@/lib/core/prisma';

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({
      status: init?.status || 200,
      json: async () => body,
      body,
    })),
  },
}));

// Mock Prisma
jest.mock('@/lib/core/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Require Recent 2FA', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkRecent2FA', () => {
    it('should return verified:true when 2FA is disabled', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        twoFactorEnabled: false,
        twoFactorVerifiedAt: null,
      });

      const result = await checkRecent2FA('user-123');

      expect(result.verified).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return verified:false when user is not found', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await checkRecent2FA('non-existent-user');

      expect(result.verified).toBe(false);
      expect(result.error).toBe('User not found');
    });

    it('should return verified:false when 2FA enabled but never verified', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        twoFactorEnabled: true,
        twoFactorVerifiedAt: null,
      });

      const result = await checkRecent2FA('user-123');

      expect(result.verified).toBe(false);
      expect(result.error).toBe('2FA verification required for this action');
    });

    it('should return verified:true when verified within time window', async () => {
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        twoFactorEnabled: true,
        twoFactorVerifiedAt: twoMinutesAgo,
      });

      const result = await checkRecent2FA('user-123');

      expect(result.verified).toBe(true);
      expect(result.verifiedAt).toEqual(twoMinutesAgo);
      expect(result.expiresAt).toBeDefined();
    });

    it('should return verified:false when verification has expired', async () => {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        twoFactorEnabled: true,
        twoFactorVerifiedAt: tenMinutesAgo,
      });

      const result = await checkRecent2FA('user-123');

      expect(result.verified).toBe(false);
      expect(result.error).toBe('2FA verification expired. Please re-verify to continue.');
      expect(result.verifiedAt).toEqual(tenMinutesAgo);
      expect(result.expiresAt).toBeDefined();
    });

    it('should respect custom maxAgeMs parameter', async () => {
      const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
      const twoMinuteWindow = 2 * 60 * 1000;

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        twoFactorEnabled: true,
        twoFactorVerifiedAt: threeMinutesAgo,
      });

      const result = await checkRecent2FA('user-123', twoMinuteWindow);

      expect(result.verified).toBe(false);
      expect(result.error).toBe('2FA verification expired. Please re-verify to continue.');
    });

    it('should return verified:true at exact boundary', async () => {
      // Set up verification exactly at the boundary (just before expiry)
      const almostFiveMinutesAgo = new Date(Date.now() - (5 * 60 * 1000 - 100));

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        twoFactorEnabled: true,
        twoFactorVerifiedAt: almostFiveMinutesAgo,
      });

      const result = await checkRecent2FA('user-123');

      expect(result.verified).toBe(true);
    });

    it('should return verified:false just past boundary', async () => {
      // Set up verification just past the boundary
      const justOverFiveMinutesAgo = new Date(Date.now() - (5 * 60 * 1000 + 1000));

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        twoFactorEnabled: true,
        twoFactorVerifiedAt: justOverFiveMinutesAgo,
      });

      const result = await checkRecent2FA('user-123');

      expect(result.verified).toBe(false);
    });

    it('should include expiresAt timestamp when verified', async () => {
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      const expectedExpiry = new Date(oneMinuteAgo.getTime() + 5 * 60 * 1000);

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        twoFactorEnabled: true,
        twoFactorVerifiedAt: oneMinuteAgo,
      });

      const result = await checkRecent2FA('user-123');

      expect(result.verified).toBe(true);
      expect(result.expiresAt).toBeDefined();
      // Allow 1 second tolerance for test execution time
      expect(Math.abs(result.expiresAt!.getTime() - expectedExpiry.getTime())).toBeLessThan(1000);
    });

    it('should query correct fields from database', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        twoFactorEnabled: false,
        twoFactorVerifiedAt: null,
      });

      await checkRecent2FA('user-123');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        select: {
          twoFactorEnabled: true,
          twoFactorVerifiedAt: true,
        },
      });
    });
  });

  describe('requireRecent2FA', () => {
    it('should return null when 2FA check passes', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        twoFactorEnabled: true,
        twoFactorVerifiedAt: new Date(),
      });

      const result = await requireRecent2FA('user-123');

      expect(result).toBeNull();
    });

    it('should return response object with 403 when 2FA check fails', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        twoFactorEnabled: true,
        twoFactorVerifiedAt: new Date(Date.now() - 10 * 60 * 1000), // Expired
      });

      const result = await requireRecent2FA('user-123');

      expect(result).not.toBeNull();
      expect(result?.status).toBe(403);
    });

    it('should return proper error structure in response body', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        twoFactorEnabled: true,
        twoFactorVerifiedAt: null,
      });

      const result = await requireRecent2FA('user-123');
      const body = await result?.json();

      expect(body).toEqual({
        error: 'Recent2FARequired',
        message: '2FA verification required for this action',
        requiresReAuth: true,
      });
    });

    it('should return null when 2FA is disabled (allowed)', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        twoFactorEnabled: false,
        twoFactorVerifiedAt: null,
      });

      const result = await requireRecent2FA('user-123');

      expect(result).toBeNull();
    });

    it('should return error response when user not found', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await requireRecent2FA('non-existent');
      const body = await result?.json();

      expect(result?.status).toBe(403);
      expect(body.error).toBe('Recent2FARequired');
      expect(body.message).toBe('User not found');
    });

    it('should respect custom maxAgeMs parameter', async () => {
      const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        twoFactorEnabled: true,
        twoFactorVerifiedAt: threeMinutesAgo,
      });

      // With default 5-minute window, should pass
      const result1 = await requireRecent2FA('user-123');
      expect(result1).toBeNull();

      // With 2-minute window, should fail
      const result2 = await requireRecent2FA('user-123', 2 * 60 * 1000);
      expect(result2).not.toBeNull();
      expect(result2?.status).toBe(403);
    });
  });

  describe('Edge Cases', () => {
    it('should handle verification at exactly now', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        twoFactorEnabled: true,
        twoFactorVerifiedAt: new Date(),
      });

      const result = await checkRecent2FA('user-123');

      expect(result.verified).toBe(true);
    });

    it('should handle very old verification timestamp', async () => {
      const veryOld = new Date('2020-01-01');

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        twoFactorEnabled: true,
        twoFactorVerifiedAt: veryOld,
      });

      const result = await checkRecent2FA('user-123');

      expect(result.verified).toBe(false);
    });

    it('should handle future verification timestamp (clock skew)', async () => {
      // This shouldn't happen in practice, but test the behavior
      const future = new Date(Date.now() + 60 * 1000);

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        twoFactorEnabled: true,
        twoFactorVerifiedAt: future,
      });

      const result = await checkRecent2FA('user-123');

      // Should be valid (negative age is still within window)
      expect(result.verified).toBe(true);
    });

    it('should handle zero maxAgeMs (require immediate verification)', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        twoFactorEnabled: true,
        twoFactorVerifiedAt: new Date(Date.now() - 1), // 1ms ago
      });

      const result = await checkRecent2FA('user-123', 0);

      // Even 1ms old should be expired with 0 window
      expect(result.verified).toBe(false);
    });

    it('should handle very large maxAgeMs', async () => {
      const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      const twoYearsMs = 2 * 365 * 24 * 60 * 60 * 1000;

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        twoFactorEnabled: true,
        twoFactorVerifiedAt: oneYearAgo,
      });

      const result = await checkRecent2FA('user-123', twoYearsMs);

      expect(result.verified).toBe(true);
    });
  });

  describe('API Route Integration Pattern', () => {
    it('should work correctly in typical API route pattern', async () => {
      // Simulate the common pattern used in super-admin routes
      const mockSession = { user: { id: 'admin-123', isSuperAdmin: true } };

      // Case 1: Verified recently - should proceed
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        twoFactorEnabled: true,
        twoFactorVerifiedAt: new Date(),
      });

      const check1 = await requireRecent2FA(mockSession.user.id);
      if (check1) {
        // Would return error response
        fail('Should not return error for valid 2FA');
      }
      // Proceed with sensitive operation
      expect(check1).toBeNull();

      // Case 2: Expired - should block
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        twoFactorEnabled: true,
        twoFactorVerifiedAt: new Date(Date.now() - 10 * 60 * 1000),
      });

      const check2 = await requireRecent2FA(mockSession.user.id);
      if (check2) {
        // Correctly returns error response
        expect(check2.status).toBe(403);
        return; // Would return from API handler
      }
      fail('Should return error for expired 2FA');
    });
  });
});
