/**
 * @file prisma-tenant.test.ts
 * @description Unit tests for tenant isolation utilities
 * @module tests/unit/lib/core
 *
 * Tests cover:
 * - Header parsing for tenant context
 * - Tenant context validation
 * - Error handling for missing context
 *
 * NOTE: The actual Prisma extension query filtering is tested
 * in integration tests since it requires a live database connection.
 */

import {
  getTenantContextFromHeaders,
  createTenantPrismaClient,
  getTenantPrismaFromHeaders,
  TenantContext,
} from '@/lib/core/prisma-tenant';

// We only mock prisma for the extension creation tests
jest.mock('@/lib/core/prisma', () => ({
  prisma: {
    $extends: jest.fn().mockReturnValue({
      // Mock extended client
      asset: { findMany: jest.fn() },
    }),
  },
}));

describe('Prisma Tenant Isolation', () => {
  // ═══════════════════════════════════════════════════════════════════════════════
  // HEADER PARSING TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('getTenantContextFromHeaders', () => {
    it('should return null when tenant ID header is missing', () => {
      const headers = new Headers();
      headers.set('x-user-id', 'user-123');

      const result = getTenantContextFromHeaders(headers);

      expect(result).toBeNull();
    });

    it('should return null when user ID header is missing', () => {
      const headers = new Headers();
      headers.set('x-tenant-id', 'tenant-123');

      const result = getTenantContextFromHeaders(headers);

      expect(result).toBeNull();
    });

    it('should return null when both required headers are missing', () => {
      const headers = new Headers();

      const result = getTenantContextFromHeaders(headers);

      expect(result).toBeNull();
    });

    it('should parse minimal required headers', () => {
      const headers = new Headers();
      headers.set('x-tenant-id', 'tenant-123');
      headers.set('x-user-id', 'user-456');

      const result = getTenantContextFromHeaders(headers);

      expect(result).not.toBeNull();
      expect(result!.tenantId).toBe('tenant-123');
      expect(result!.userId).toBe('user-456');
      expect(result!.userRole).toBeUndefined();
      expect(result!.isAdmin).toBeUndefined();
      expect(result!.isOwner).toBeUndefined();
      expect(result!.subscriptionTier).toBeUndefined();
    });

    it('should parse all optional headers', () => {
      const headers = new Headers();
      headers.set('x-tenant-id', 'tenant-123');
      headers.set('x-user-id', 'user-456');
      headers.set('x-user-role', 'ADMIN');
      headers.set('x-subscription-tier', 'PROFESSIONAL');

      const result = getTenantContextFromHeaders(headers);

      expect(result).not.toBeNull();
      expect(result!.tenantId).toBe('tenant-123');
      expect(result!.userId).toBe('user-456');
      expect(result!.userRole).toBe('ADMIN');
      // Note: isAdmin and isOwner are added by handler.ts from session, not headers
      expect(result!.isAdmin).toBeUndefined();
      expect(result!.isOwner).toBeUndefined();
      expect(result!.subscriptionTier).toBe('PROFESSIONAL');
    });

    it('should handle empty string headers as missing', () => {
      const headers = new Headers();
      headers.set('x-tenant-id', '');
      headers.set('x-user-id', 'user-123');

      const result = getTenantContextFromHeaders(headers);

      // Empty strings are falsy, so this should return null
      expect(result).toBeNull();
    });

    it('should preserve special characters in header values', () => {
      const headers = new Headers();
      headers.set('x-tenant-id', 'tenant_123-abc');
      headers.set('x-user-id', 'user@example.com');

      const result = getTenantContextFromHeaders(headers);

      expect(result).not.toBeNull();
      expect(result!.tenantId).toBe('tenant_123-abc');
      expect(result!.userId).toBe('user@example.com');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // TENANT PRISMA CLIENT CREATION
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('createTenantPrismaClient', () => {
    it('should throw error when tenantId is empty', () => {
      const context: TenantContext = {
        tenantId: '',
        userId: 'user-123',
      };

      expect(() => createTenantPrismaClient(context)).toThrow(
        'Tenant context required for database operations'
      );
    });

    it('should create client when tenantId is provided', () => {
      const context: TenantContext = {
        tenantId: 'tenant-123',
        userId: 'user-456',
      };

      const client = createTenantPrismaClient(context);

      expect(client).toBeDefined();
    });

    it('should work with minimal context (only tenantId and userId)', () => {
      const context: TenantContext = {
        tenantId: 'tenant-123',
        userId: 'user-456',
      };

      expect(() => createTenantPrismaClient(context)).not.toThrow();
    });

    it('should work with full context including optional fields', () => {
      const context: TenantContext = {
        tenantId: 'tenant-123',
        userId: 'user-456',
        userRole: 'ADMIN',
        isAdmin: true,
        isOwner: true,
        subscriptionTier: 'PROFESSIONAL',
      };

      expect(() => createTenantPrismaClient(context)).not.toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // GET TENANT PRISMA FROM HEADERS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('getTenantPrismaFromHeaders', () => {
    it('should throw error when tenant context is missing', () => {
      const headers = new Headers();

      expect(() => getTenantPrismaFromHeaders(headers)).toThrow(
        'Tenant context not found in request headers'
      );
    });

    it('should throw error when only tenant ID is present', () => {
      const headers = new Headers();
      headers.set('x-tenant-id', 'tenant-123');

      expect(() => getTenantPrismaFromHeaders(headers)).toThrow(
        'Tenant context not found in request headers'
      );
    });

    it('should throw error when only user ID is present', () => {
      const headers = new Headers();
      headers.set('x-user-id', 'user-123');

      expect(() => getTenantPrismaFromHeaders(headers)).toThrow(
        'Tenant context not found in request headers'
      );
    });

    it('should return client when valid headers are present', () => {
      const headers = new Headers();
      headers.set('x-tenant-id', 'tenant-123');
      headers.set('x-user-id', 'user-456');

      const client = getTenantPrismaFromHeaders(headers);

      expect(client).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // SECURITY CONSIDERATIONS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Security considerations', () => {
    it('should not leak sensitive information in error messages', () => {
      const headers = new Headers();

      try {
        getTenantPrismaFromHeaders(headers);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        const message = (error as Error).message;
        // Error message should not contain internal details
        expect(message).not.toContain('prisma');
        expect(message).not.toContain('database');
        expect(message).not.toContain('sql');
      }
    });

    it('should handle potentially malicious tenant IDs safely', () => {
      const headers = new Headers();
      // Attempt SQL injection (should be handled by Prisma parameterization)
      headers.set('x-tenant-id', "'; DROP TABLE Asset; --");
      headers.set('x-user-id', 'user-123');

      // Should parse without issue - actual SQL safety is at Prisma level
      const result = getTenantContextFromHeaders(headers);

      expect(result).not.toBeNull();
      expect(result!.tenantId).toBe("'; DROP TABLE Asset; --");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // TYPE SAFETY TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Type safety', () => {
    it('should return correctly typed TenantContext', () => {
      const headers = new Headers();
      headers.set('x-tenant-id', 'tenant-123');
      headers.set('x-user-id', 'user-456');
      headers.set('x-user-role', 'ADMIN');

      const result = getTenantContextFromHeaders(headers);

      // TypeScript type assertions
      if (result) {
        const tenantId: string = result.tenantId;
        const userId: string = result.userId;
        const userRole: string | undefined = result.userRole;

        expect(typeof tenantId).toBe('string');
        expect(typeof userId).toBe('string');
        expect(typeof userRole).toBe('string');
      }
    });

    it('should not read isAdmin and isOwner from headers (they are added by handler)', () => {
      // Note: isAdmin and isOwner are added by handler.ts from the session,
      // not parsed from headers by getTenantContextFromHeaders.
      // The headers are set by middleware which doesn't have access to session boolean flags.
      const headers = new Headers();
      headers.set('x-tenant-id', 'tenant-123');
      headers.set('x-user-id', 'user-456');

      const result = getTenantContextFromHeaders(headers);

      // isAdmin and isOwner should be undefined when parsed from headers
      expect(result?.isAdmin).toBeUndefined();
      expect(result?.isOwner).toBeUndefined();

      // The TenantContext interface allows these fields to be set,
      // but they are populated later in the handler after getting the session
    });

    it('should handle all expected subscription tiers', () => {
      const tiers = ['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'];

      for (const tier of tiers) {
        const headers = new Headers();
        headers.set('x-tenant-id', 'tenant-123');
        headers.set('x-user-id', 'user-456');
        headers.set('x-subscription-tier', tier);

        const result = getTenantContextFromHeaders(headers);
        expect(result?.subscriptionTier).toBe(tier);
      }
    });
  });
});
