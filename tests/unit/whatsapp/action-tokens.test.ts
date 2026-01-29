/**
 * @file action-tokens.test.ts
 * @description Unit tests for WhatsApp action token system
 */

import { prisma } from '@/lib/core/prisma';

// Mock Prisma
jest.mock('@/lib/core/prisma', () => ({
  prisma: {
    whatsAppActionToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

// Mock logger
jest.mock('@/lib/core/log', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock crypto for deterministic tests
jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => Buffer.from('1234567890abcdef')),
  createHmac: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'abcdef1234567890abcdef1234567890'),
  })),
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('WhatsApp Action Tokens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.WHATSAPP_ENCRYPTION_KEY = 'test-encryption-key-32-chars-long';
  });

  afterEach(() => {
    delete process.env.WHATSAPP_ENCRYPTION_KEY;
  });

  describe('generateActionToken', () => {
    it('should create valid token with correct structure', async () => {
      const { generateActionToken } = await import('@/lib/whatsapp/action-tokens');

      (mockPrisma.whatsAppActionToken.create as jest.Mock).mockResolvedValue({
        id: 'token-id-1',
        token: '31323334353637383930616263646566:abcdef1234567890',
      });

      const token = await generateActionToken({
        tenantId: 'tenant-123',
        entityType: 'LEAVE_REQUEST',
        entityId: 'leave-456',
        action: 'approve',
        approverId: 'member-789',
      });

      expect(token).toContain(':');
      expect(mockPrisma.whatsAppActionToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'tenant-123',
          entityType: 'LEAVE_REQUEST',
          entityId: 'leave-456',
          action: 'approve',
          approverId: 'member-789',
          expiresAt: expect.any(Date),
        }),
      });
    });
  });

  describe('generateActionTokenPair', () => {
    it('should generate both approve and reject tokens', async () => {
      const { generateActionTokenPair } = await import('@/lib/whatsapp/action-tokens');

      (mockPrisma.whatsAppActionToken.create as jest.Mock).mockResolvedValue({
        id: 'token-id',
        token: 'test-token',
      });

      const result = await generateActionTokenPair({
        tenantId: 'tenant-123',
        entityType: 'LEAVE_REQUEST',
        entityId: 'leave-456',
        approverId: 'member-789',
      });

      expect(result).toHaveProperty('approveToken');
      expect(result).toHaveProperty('rejectToken');
      expect(mockPrisma.whatsAppActionToken.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('validateAndConsumeToken', () => {
    it('should validate and consume valid token', async () => {
      const { validateAndConsumeToken } = await import('@/lib/whatsapp/action-tokens');

      const futureDate = new Date(Date.now() + 60000);
      (mockPrisma.whatsAppActionToken.findUnique as jest.Mock).mockResolvedValue({
        id: 'token-id',
        token: '31323334353637383930616263646566:abcdef1234567890',
        tenantId: 'tenant-123',
        entityType: 'LEAVE_REQUEST',
        entityId: 'leave-456',
        action: 'approve',
        approverId: 'member-789',
        used: false,
        expiresAt: futureDate,
      });
      (mockPrisma.whatsAppActionToken.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      const result = await validateAndConsumeToken('31323334353637383930616263646566:abcdef1234567890');

      expect(result.valid).toBe(true);
      expect(result.payload).toBeDefined();
      expect(result.payload?.tenantId).toBe('tenant-123');
      expect(result.payload?.action).toBe('approve');
    });

    it('should reject expired token', async () => {
      const { validateAndConsumeToken } = await import('@/lib/whatsapp/action-tokens');

      const pastDate = new Date(Date.now() - 60000);
      (mockPrisma.whatsAppActionToken.findUnique as jest.Mock).mockResolvedValue({
        id: 'token-id',
        token: 'test-token',
        used: false,
        expiresAt: pastDate,
      });

      const result = await validateAndConsumeToken('test-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token expired');
    });

    it('should reject used token', async () => {
      const { validateAndConsumeToken } = await import('@/lib/whatsapp/action-tokens');

      (mockPrisma.whatsAppActionToken.findUnique as jest.Mock).mockResolvedValue({
        id: 'token-id',
        token: 'test-token',
        used: true,
        expiresAt: new Date(Date.now() + 60000),
      });

      const result = await validateAndConsumeToken('test-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token already used');
    });

    it('should reject missing token', async () => {
      const { validateAndConsumeToken } = await import('@/lib/whatsapp/action-tokens');

      (mockPrisma.whatsAppActionToken.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await validateAndConsumeToken('nonexistent-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token not found');
    });

    it('should prevent race conditions with atomic update', async () => {
      const { validateAndConsumeToken } = await import('@/lib/whatsapp/action-tokens');

      const futureDate = new Date(Date.now() + 60000);
      (mockPrisma.whatsAppActionToken.findUnique as jest.Mock).mockResolvedValue({
        id: 'token-id',
        token: '31323334353637383930616263646566:abcdef1234567890',
        tenantId: 'tenant-123',
        entityType: 'LEAVE_REQUEST',
        entityId: 'leave-456',
        action: 'approve',
        approverId: 'member-789',
        used: false,
        expiresAt: futureDate,
      });
      // Simulate race condition - token was used between find and update
      (mockPrisma.whatsAppActionToken.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      const result = await validateAndConsumeToken('31323334353637383930616263646566:abcdef1234567890');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token already used (race condition)');
    });
  });

  describe('validateToken', () => {
    it('should validate token without consuming it', async () => {
      const { validateToken } = await import('@/lib/whatsapp/action-tokens');

      const futureDate = new Date(Date.now() + 60000);
      (mockPrisma.whatsAppActionToken.findUnique as jest.Mock).mockResolvedValue({
        id: 'token-id',
        token: 'test-token',
        tenantId: 'tenant-123',
        entityType: 'LEAVE_REQUEST',
        entityId: 'leave-456',
        action: 'approve',
        approverId: 'member-789',
        used: false,
        expiresAt: futureDate,
      });

      const result = await validateToken('test-token');

      expect(result.valid).toBe(true);
      expect(result.payload).toBeDefined();
      // Should NOT call updateMany
      expect(mockPrisma.whatsAppActionToken.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should delete expired tokens', async () => {
      const { cleanupExpiredTokens } = await import('@/lib/whatsapp/action-tokens');

      (mockPrisma.whatsAppActionToken.deleteMany as jest.Mock).mockResolvedValue({ count: 5 });

      const result = await cleanupExpiredTokens();

      expect(result).toBe(5);
      expect(mockPrisma.whatsAppActionToken.deleteMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { expiresAt: { lt: expect.any(Date) } },
            {
              used: true,
              usedAt: { lt: expect.any(Date) },
            },
          ],
        },
      });
    });

    it('should return 0 when no tokens to cleanup', async () => {
      const { cleanupExpiredTokens } = await import('@/lib/whatsapp/action-tokens');

      (mockPrisma.whatsAppActionToken.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });

      const result = await cleanupExpiredTokens();

      expect(result).toBe(0);
    });

    it('should delete both expired and old used tokens', async () => {
      const { cleanupExpiredTokens } = await import('@/lib/whatsapp/action-tokens');

      (mockPrisma.whatsAppActionToken.deleteMany as jest.Mock).mockResolvedValue({ count: 10 });

      await cleanupExpiredTokens();

      const deleteCall = (mockPrisma.whatsAppActionToken.deleteMany as jest.Mock).mock.calls[0][0];
      expect(deleteCall.where.OR).toHaveLength(2);
      expect(deleteCall.where.OR[0]).toHaveProperty('expiresAt');
      expect(deleteCall.where.OR[1]).toHaveProperty('used', true);
      expect(deleteCall.where.OR[1]).toHaveProperty('usedAt');
    });
  });

  describe('invalidateTokensForEntity', () => {
    it('should mark all entity tokens as used', async () => {
      const { invalidateTokensForEntity } = await import('@/lib/whatsapp/action-tokens');

      (mockPrisma.whatsAppActionToken.updateMany as jest.Mock).mockResolvedValue({ count: 2 });

      await invalidateTokensForEntity('LEAVE_REQUEST', 'leave-456');

      expect(mockPrisma.whatsAppActionToken.updateMany).toHaveBeenCalledWith({
        where: {
          entityType: 'LEAVE_REQUEST',
          entityId: 'leave-456',
          used: false,
        },
        data: {
          used: true,
          usedAt: expect.any(Date),
        },
      });
    });

    it('should handle case with no pending tokens', async () => {
      const { invalidateTokensForEntity } = await import('@/lib/whatsapp/action-tokens');

      (mockPrisma.whatsAppActionToken.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      // Should not throw
      await expect(
        invalidateTokensForEntity('LEAVE_REQUEST', 'leave-456')
      ).resolves.toBeUndefined();
    });

    it('should only invalidate unused tokens', async () => {
      const { invalidateTokensForEntity } = await import('@/lib/whatsapp/action-tokens');

      (mockPrisma.whatsAppActionToken.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      await invalidateTokensForEntity('SPEND_REQUEST', 'spend-123');

      const updateCall = (mockPrisma.whatsAppActionToken.updateMany as jest.Mock).mock.calls[0][0];
      expect(updateCall.where.used).toBe(false);
    });
  });
});
