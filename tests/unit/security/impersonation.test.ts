/**
 * @file impersonation.test.ts
 * @description Tests for impersonation token management and security
 */

import crypto from 'crypto';
import { prisma } from '@/lib/core/prisma';
import { logAction } from '@/lib/core/activity';
import {
  generateJti,
  isTokenRevoked,
  revokeToken,
  revokeAllTokensForSuperAdmin,
  cleanupExpiredRevocations,
  getImpersonationHistory,
} from '@/lib/security/impersonation';

// Mock Prisma
jest.mock('@/lib/core/prisma', () => ({
  prisma: {
    revokedImpersonationToken: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
  },
}));

// Mock activity logging
jest.mock('@/lib/core/activity', () => ({
  logAction: jest.fn(),
  ActivityActions: {
    SECURITY_IMPERSONATION_REVOKED: 'SECURITY_IMPERSONATION_REVOKED',
  },
}));

// Mock crypto
jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => ({
    toString: () => 'abcdef1234567890abcdef1234567890',
  })),
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Impersonation Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateJti', () => {
    it('should generate a JTI with imp_ prefix', () => {
      const jti = generateJti();

      expect(jti).toMatch(/^imp_/);
    });

    it('should generate a unique identifier', () => {
      const jti = generateJti();

      expect(jti.length).toBeGreaterThan(4); // imp_ prefix + hex
      expect(jti).toBe('imp_abcdef1234567890abcdef1234567890');
    });

    it('should use 16 random bytes (32 hex chars)', () => {
      const jti = generateJti();

      const hexPart = jti.replace('imp_', '');
      expect(hexPart.length).toBe(32);
    });
  });

  describe('isTokenRevoked', () => {
    it('should return false for empty JTI', async () => {
      const result = await isTokenRevoked('');

      expect(result).toBe(false);
      expect(mockPrisma.revokedImpersonationToken.findUnique).not.toHaveBeenCalled();
    });

    it('should return false if token not found in revocation list', async () => {
      (mockPrisma.revokedImpersonationToken.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await isTokenRevoked('imp_test-jti');

      expect(result).toBe(false);
      expect(mockPrisma.revokedImpersonationToken.findUnique).toHaveBeenCalledWith({
        where: { jti: 'imp_test-jti' },
        select: { id: true },
      });
    });

    it('should return true if token is in revocation list', async () => {
      (mockPrisma.revokedImpersonationToken.findUnique as jest.Mock).mockResolvedValue({
        id: 'revoked-123',
      });

      const result = await isTokenRevoked('imp_revoked-jti');

      expect(result).toBe(true);
    });

    it('should fail safe and return true on database error', async () => {
      (mockPrisma.revokedImpersonationToken.findUnique as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const result = await isTokenRevoked('imp_error-jti');

      // Fail safe - treat as revoked when we can't verify
      expect(result).toBe(true);
    });
  });

  describe('revokeToken', () => {
    it('should upsert revocation record', async () => {
      (mockPrisma.revokedImpersonationToken.upsert as jest.Mock).mockResolvedValue({});

      const params = {
        jti: 'imp_test-jti',
        revokedBy: 'admin-123',
        reason: 'Session ended',
        superAdminId: 'super-admin-123',
        organizationId: 'org-123',
        organizationSlug: 'acme',
        issuedAt: new Date('2024-01-01'),
        expiresAt: new Date('2024-01-02'),
      };

      await revokeToken(params);

      expect(mockPrisma.revokedImpersonationToken.upsert).toHaveBeenCalledWith({
        where: { jti: 'imp_test-jti' },
        create: {
          jti: 'imp_test-jti',
          revokedBy: 'admin-123',
          reason: 'Session ended',
          superAdminId: 'super-admin-123',
          organizationId: 'org-123',
          organizationSlug: 'acme',
          issuedAt: params.issuedAt,
          expiresAt: params.expiresAt,
        },
        update: {
          revokedBy: 'admin-123',
          reason: 'Session ended',
          revokedAt: expect.any(Date),
        },
      });
    });

    it('should handle revocation without reason', async () => {
      (mockPrisma.revokedImpersonationToken.upsert as jest.Mock).mockResolvedValue({});

      const params = {
        jti: 'imp_test-jti',
        revokedBy: 'admin-123',
        superAdminId: 'super-admin-123',
        organizationId: 'org-123',
        organizationSlug: 'acme',
        issuedAt: new Date('2024-01-01'),
        expiresAt: new Date('2024-01-02'),
      };

      await revokeToken(params);

      expect(mockPrisma.revokedImpersonationToken.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            reason: undefined,
          }),
        })
      );
    });
  });

  describe('revokeAllTokensForSuperAdmin', () => {
    beforeEach(() => {
      (mockPrisma.revokedImpersonationToken.create as jest.Mock).mockResolvedValue({});
      (mockPrisma.user.update as jest.Mock).mockResolvedValue({});
    });

    it('should create bulk revocation entry', async () => {
      await revokeAllTokensForSuperAdmin(
        'super-admin-123',
        'system',
        'Security breach',
        'org-123'
      );

      expect(mockPrisma.revokedImpersonationToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          jti: expect.stringMatching(/^bulk_revoke_super-admin-123_/),
          revokedBy: 'system',
          reason: 'Security breach',
          superAdminId: 'super-admin-123',
          organizationId: 'org-123',
          organizationSlug: 'BULK_REVOKE',
        }),
      });
    });

    it('should update user passwordChangedAt for defense-in-depth', async () => {
      await revokeAllTokensForSuperAdmin('super-admin-123', 'system');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'super-admin-123' },
        data: { passwordChangedAt: expect.any(Date) },
      });
    });

    it('should log audit action when organizationId is provided', async () => {
      await revokeAllTokensForSuperAdmin(
        'super-admin-123',
        'system',
        'Security breach',
        'org-123'
      );

      expect(logAction).toHaveBeenCalledWith(
        'org-123',
        'system',
        'SECURITY_IMPERSONATION_REVOKED',
        'SECURITY',
        'super-admin-123',
        expect.objectContaining({
          superAdminId: 'super-admin-123',
          revokedBy: 'system',
          reason: 'Security breach',
          action: 'REVOKE_ALL_TOKENS',
        })
      );
    });

    it('should not log audit action when organizationId is not provided', async () => {
      await revokeAllTokensForSuperAdmin('super-admin-123', 'system', 'Security breach');

      expect(logAction).not.toHaveBeenCalled();
    });

    it('should return 1 (bulk revocation created)', async () => {
      const result = await revokeAllTokensForSuperAdmin('super-admin-123', 'system');

      expect(result).toBe(1);
    });
  });

  describe('cleanupExpiredRevocations', () => {
    it('should delete expired revocation records', async () => {
      (mockPrisma.revokedImpersonationToken.deleteMany as jest.Mock).mockResolvedValue({
        count: 5,
      });

      const result = await cleanupExpiredRevocations();

      expect(result).toBe(5);
      expect(mockPrisma.revokedImpersonationToken.deleteMany).toHaveBeenCalledWith({
        where: {
          expiresAt: {
            lt: expect.any(Date),
          },
        },
      });
    });

    it('should return 0 when no records to clean', async () => {
      (mockPrisma.revokedImpersonationToken.deleteMany as jest.Mock).mockResolvedValue({
        count: 0,
      });

      const result = await cleanupExpiredRevocations();

      expect(result).toBe(0);
    });
  });

  describe('getImpersonationHistory', () => {
    it('should return impersonation history for super admin', async () => {
      const mockHistory = [
        {
          id: 'record-1',
          organizationId: 'org-1',
          organizationSlug: 'acme',
          issuedAt: new Date('2024-01-01'),
          expiresAt: new Date('2024-01-01T00:15:00'),
          revokedAt: new Date('2024-01-01T00:10:00'),
          reason: 'Session ended',
        },
        {
          id: 'record-2',
          organizationId: 'org-2',
          organizationSlug: 'globex',
          issuedAt: new Date('2024-01-02'),
          expiresAt: new Date('2024-01-02T00:15:00'),
          revokedAt: new Date('2024-01-02T00:05:00'),
          reason: null,
        },
      ];

      (mockPrisma.revokedImpersonationToken.findMany as jest.Mock).mockResolvedValue(mockHistory);

      const result = await getImpersonationHistory('super-admin-123');

      expect(result).toEqual(mockHistory);
      expect(mockPrisma.revokedImpersonationToken.findMany).toHaveBeenCalledWith({
        where: { superAdminId: 'super-admin-123' },
        orderBy: { revokedAt: 'desc' },
        take: 20,
        select: {
          id: true,
          organizationId: true,
          organizationSlug: true,
          issuedAt: true,
          expiresAt: true,
          revokedAt: true,
          reason: true,
        },
      });
    });

    it('should use custom limit', async () => {
      (mockPrisma.revokedImpersonationToken.findMany as jest.Mock).mockResolvedValue([]);

      await getImpersonationHistory('super-admin-123', 10);

      expect(mockPrisma.revokedImpersonationToken.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        })
      );
    });

    it('should return empty array when no history', async () => {
      (mockPrisma.revokedImpersonationToken.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getImpersonationHistory('super-admin-123');

      expect(result).toEqual([]);
    });
  });

  describe('Security Considerations', () => {
    describe('Token Format', () => {
      it('should use a recognizable prefix for impersonation tokens', () => {
        const jti = generateJti();

        // Prefix makes it easy to identify impersonation tokens in logs
        expect(jti.startsWith('imp_')).toBe(true);
      });

      it('should generate cryptographically secure random identifiers', () => {
        generateJti();

        expect(crypto.randomBytes).toHaveBeenCalledWith(16);
      });
    });

    describe('Fail-Safe Behavior', () => {
      it('should treat unknown tokens as revoked on database error', async () => {
        (mockPrisma.revokedImpersonationToken.findUnique as jest.Mock).mockRejectedValue(
          new Error('Connection failed')
        );

        const result = await isTokenRevoked('imp_unknown');

        // Fail safe - block access when in doubt
        expect(result).toBe(true);
      });
    });

    describe('Audit Trail', () => {
      it('should record who revoked the token', async () => {
        (mockPrisma.revokedImpersonationToken.upsert as jest.Mock).mockResolvedValue({});

        await revokeToken({
          jti: 'imp_test',
          revokedBy: 'security-team@example.com',
          superAdminId: 'super-admin-123',
          organizationId: 'org-123',
          organizationSlug: 'acme',
          issuedAt: new Date(),
          expiresAt: new Date(),
        });

        expect(mockPrisma.revokedImpersonationToken.upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            create: expect.objectContaining({
              revokedBy: 'security-team@example.com',
            }),
          })
        );
      });

      it('should record revocation reason', async () => {
        (mockPrisma.revokedImpersonationToken.upsert as jest.Mock).mockResolvedValue({});

        await revokeToken({
          jti: 'imp_test',
          revokedBy: 'admin',
          reason: 'Suspicious activity detected',
          superAdminId: 'super-admin-123',
          organizationId: 'org-123',
          organizationSlug: 'acme',
          issuedAt: new Date(),
          expiresAt: new Date(),
        });

        expect(mockPrisma.revokedImpersonationToken.upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            create: expect.objectContaining({
              reason: 'Suspicious activity detected',
            }),
          })
        );
      });

      it('should track which organization was being impersonated', async () => {
        (mockPrisma.revokedImpersonationToken.upsert as jest.Mock).mockResolvedValue({});

        await revokeToken({
          jti: 'imp_test',
          revokedBy: 'admin',
          superAdminId: 'super-admin-123',
          organizationId: 'target-org-123',
          organizationSlug: 'target-company',
          issuedAt: new Date(),
          expiresAt: new Date(),
        });

        expect(mockPrisma.revokedImpersonationToken.upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            create: expect.objectContaining({
              organizationId: 'target-org-123',
              organizationSlug: 'target-company',
            }),
          })
        );
      });
    });

    describe('Cleanup', () => {
      it('should clean up expired tokens to prevent database bloat', async () => {
        (mockPrisma.revokedImpersonationToken.deleteMany as jest.Mock).mockResolvedValue({
          count: 100,
        });

        const result = await cleanupExpiredRevocations();

        expect(result).toBe(100);
        expect(mockPrisma.revokedImpersonationToken.deleteMany).toHaveBeenCalledWith({
          where: {
            expiresAt: {
              lt: expect.any(Date),
            },
          },
        });
      });
    });
  });
});
