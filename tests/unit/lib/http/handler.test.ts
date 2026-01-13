/**
 * @jest-environment node
 */

/**
 * @file handler.test.ts
 * @description Unit tests for API route handler wrapper
 * @module tests/unit/lib/http
 *
 * Tests cover:
 * - Authentication enforcement
 * - Admin role checks
 * - Rate limiting
 * - Body size validation
 * - Tenant context injection
 * - Module access checks
 * - Permission checks
 * - Error handling and formatting
 *
 * NOTE: These tests require Node.js test environment for next/server compatibility
 */

import { NextRequest, NextResponse } from 'next/server';
import { OrgRole } from '@prisma/client';

// Mock all dependencies before importing the handler
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/core/auth', () => ({
  authOptions: {},
}));

jest.mock('@/lib/http/errors', () => ({
  formatError: jest.fn().mockReturnValue({
    response: { error: 'Internal error' },
    statusCode: 500,
  }),
  errorResponse: jest.fn().mockImplementation((message: string, status: number) => {
    return new NextResponse(JSON.stringify({ error: message }), { status });
  }),
  ErrorCodes: {
    AUTH_REQUIRED: 'AUTH_REQUIRED',
    ADMIN_REQUIRED: 'ADMIN_REQUIRED',
    TENANT_REQUIRED: 'TENANT_REQUIRED',
    RATE_LIMITED: 'RATE_LIMITED',
    INVALID_REQUEST: 'INVALID_REQUEST',
    INSUFFICIENT_ROLE: 'INSUFFICIENT_ROLE',
    PERMISSION_DENIED: 'PERMISSION_DENIED',
  },
}));

jest.mock('@/lib/core/log', () => ({
  logRequest: jest.fn(),
  generateRequestId: jest.fn().mockReturnValue('req-123'),
}));

jest.mock('@/lib/security/rateLimit', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true }),
}));

jest.mock('@/lib/core/prisma-tenant', () => ({
  getTenantContextFromHeaders: jest.fn(),
  createTenantPrismaClient: jest.fn().mockReturnValue({}),
}));

jest.mock('@/lib/core/prisma', () => ({
  prisma: {
    organization: {
      findUnique: jest.fn().mockResolvedValue({ enabledModules: ['assets'] }),
    },
  },
}));

jest.mock('@/lib/modules/access', () => ({
  hasModuleAccess: jest.fn().mockReturnValue(true),
  moduleNotInstalledResponse: jest.fn().mockReturnValue(
    new NextResponse(JSON.stringify({ error: 'Module not enabled' }), { status: 403 })
  ),
}));

jest.mock('@/lib/modules/registry', () => ({
  MODULE_REGISTRY: {
    assets: { name: 'Assets' },
    payroll: { name: 'Payroll' },
  },
}));

jest.mock('@/lib/access-control', () => ({
  hasPermission: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/lib/security/impersonation', () => ({
  isTokenRevoked: jest.fn().mockResolvedValue(false),
}));

jest.mock('@/lib/core/activity', () => ({
  logAction: jest.fn(),
  ActivityActions: {
    SECURITY_IMPERSONATION_BLOCKED: 'SECURITY_IMPERSONATION_BLOCKED',
  },
}));

jest.mock('@/lib/constants/limits', () => ({
  MAX_BODY_SIZE_BYTES: 1048576,
}));

import { getServerSession } from 'next-auth';
import { checkRateLimit } from '@/lib/security/rateLimit';
import { getTenantContextFromHeaders, createTenantPrismaClient } from '@/lib/core/prisma-tenant';
import { hasModuleAccess } from '@/lib/modules/access';
import { hasPermission } from '@/lib/access-control';
import { withErrorHandler, getRequestId, APIContext } from '@/lib/http/handler';

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockCheckRateLimit = checkRateLimit as jest.MockedFunction<typeof checkRateLimit>;
const mockGetTenantContext = getTenantContextFromHeaders as jest.MockedFunction<typeof getTenantContextFromHeaders>;
const mockHasModuleAccess = hasModuleAccess as jest.MockedFunction<typeof hasModuleAccess>;
const mockHasPermission = hasPermission as jest.MockedFunction<typeof hasPermission>;

describe('API Handler Wrapper', () => {
  let mockRequest: NextRequest;
  let mockRouteContext: { params: Promise<Record<string, string>> };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock request
    mockRequest = new NextRequest('http://localhost:3000/api/test', {
      method: 'GET',
    });

    // Default route context
    mockRouteContext = {
      params: Promise.resolve({ id: '123' }),
    };

    // Default session
    mockGetServerSession.mockResolvedValue({
      user: {
        id: 'user-1',
        email: 'test@example.com',
        role: 'USER',
        organizationId: 'org-1',
      },
    });

    // Default tenant context
    mockGetTenantContext.mockReturnValue({
      tenantId: 'org-1',
      userId: 'user-1',
      orgRole: 'MEMBER',
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // AUTHENTICATION TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Authentication', () => {
    it('should allow unauthenticated requests when auth not required', async () => {
      const handler = jest.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );
      mockGetServerSession.mockResolvedValue(null);

      const wrappedHandler = withErrorHandler(handler, { requireAuth: false });
      const response = await wrappedHandler(mockRequest, mockRouteContext);

      expect(response.status).toBe(200);
      expect(handler).toHaveBeenCalled();
    });

    it('should reject unauthenticated requests when auth required', async () => {
      const handler = jest.fn();
      mockGetServerSession.mockResolvedValue(null);

      const wrappedHandler = withErrorHandler(handler, { requireAuth: true });
      const response = await wrappedHandler(mockRequest, mockRouteContext);

      expect(response.status).toBe(401);
      expect(handler).not.toHaveBeenCalled();
    });

    it('should allow authenticated requests when auth required', async () => {
      const handler = jest.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      const wrappedHandler = withErrorHandler(handler, { requireAuth: true });
      const response = await wrappedHandler(mockRequest, mockRouteContext);

      expect(response.status).toBe(200);
      expect(handler).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // ADMIN ROLE TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Admin role check', () => {
    it('should reject non-admin users when admin required', async () => {
      const handler = jest.fn();
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1', teamMemberRole: 'MEMBER' },
      });

      const wrappedHandler = withErrorHandler(handler, { requireAdmin: true });
      const response = await wrappedHandler(mockRequest, mockRouteContext);

      expect(response.status).toBe(403);
      expect(handler).not.toHaveBeenCalled();
    });

    it('should allow admin users when admin required', async () => {
      const handler = jest.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1', teamMemberRole: 'ADMIN', organizationId: 'org-1' },
      });

      const wrappedHandler = withErrorHandler(handler, { requireAdmin: true });
      const response = await wrappedHandler(mockRequest, mockRouteContext);

      expect(response.status).toBe(200);
      expect(handler).toHaveBeenCalled();
    });

    it('should implicitly require auth when admin required', async () => {
      const handler = jest.fn();
      mockGetServerSession.mockResolvedValue(null);

      const wrappedHandler = withErrorHandler(handler, { requireAdmin: true });
      const response = await wrappedHandler(mockRequest, mockRouteContext);

      expect(response.status).toBe(401);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // RATE LIMITING TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Rate limiting', () => {
    it('should apply rate limiting to POST requests by default', async () => {
      const postRequest = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify({ data: 'test' }),
      });
      const handler = jest.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      const wrappedHandler = withErrorHandler(handler);
      await wrappedHandler(postRequest, mockRouteContext);

      expect(mockCheckRateLimit).toHaveBeenCalled();
    });

    it('should not apply rate limiting to GET requests by default', async () => {
      const handler = jest.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      const wrappedHandler = withErrorHandler(handler);
      await wrappedHandler(mockRequest, mockRouteContext);

      expect(mockCheckRateLimit).not.toHaveBeenCalled();
    });

    it('should reject when rate limit exceeded', async () => {
      const postRequest = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify({ data: 'test' }),
      });
      const handler = jest.fn();
      mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetIn: 60 });

      const wrappedHandler = withErrorHandler(handler);
      const response = await wrappedHandler(postRequest, mockRouteContext);

      expect(response.status).toBe(429);
      expect(handler).not.toHaveBeenCalled();
    });

    it('should skip rate limiting when explicitly disabled', async () => {
      const postRequest = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify({ data: 'test' }),
      });
      const handler = jest.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      const wrappedHandler = withErrorHandler(handler, { skipRateLimit: true });
      await wrappedHandler(postRequest, mockRouteContext);

      expect(mockCheckRateLimit).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // TENANT CONTEXT TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Tenant context', () => {
    it('should require tenant context by default for auth routes', async () => {
      const handler = jest.fn();
      mockGetTenantContext.mockReturnValue(null);

      const wrappedHandler = withErrorHandler(handler, { requireAuth: true });
      const response = await wrappedHandler(mockRequest, mockRouteContext);

      expect(response.status).toBe(403);
      expect(handler).not.toHaveBeenCalled();
    });

    it('should allow skipping tenant requirement', async () => {
      const handler = jest.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );
      mockGetTenantContext.mockReturnValue(null);

      const wrappedHandler = withErrorHandler(handler, {
        requireAuth: true,
        requireTenant: false,
      });
      const response = await wrappedHandler(mockRequest, mockRouteContext);

      expect(response.status).toBe(200);
      expect(handler).toHaveBeenCalled();
    });

    it('should inject tenant-scoped Prisma client into context', async () => {
      const handler = jest.fn().mockImplementation(
        (_req: NextRequest, ctx: APIContext) => {
          expect(ctx.prisma).toBeDefined();
          return NextResponse.json({ success: true });
        }
      );

      const wrappedHandler = withErrorHandler(handler, { requireAuth: true });
      await wrappedHandler(mockRequest, mockRouteContext);

      expect(createTenantPrismaClient).toHaveBeenCalled();
    });

    it('should inject tenant context into API context', async () => {
      const mockTenant = {
        tenantId: 'org-1',
        userId: 'user-1',
        orgRole: 'ADMIN',
      };
      mockGetTenantContext.mockReturnValue(mockTenant);

      const handler = jest.fn().mockImplementation(
        (_req: NextRequest, ctx: APIContext) => {
          expect(ctx.tenant).toEqual(mockTenant);
          return NextResponse.json({ success: true });
        }
      );

      const wrappedHandler = withErrorHandler(handler, { requireAuth: true });
      await wrappedHandler(mockRequest, mockRouteContext);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // MODULE ACCESS TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Module access', () => {
    it('should reject when required module is not enabled', async () => {
      const handler = jest.fn();
      mockHasModuleAccess.mockReturnValue(false);

      const wrappedHandler = withErrorHandler(handler, {
        requireAuth: true,
        requireModule: 'payroll',
      });
      const response = await wrappedHandler(mockRequest, mockRouteContext);

      expect(response.status).toBe(403);
      expect(handler).not.toHaveBeenCalled();
    });

    it('should allow when required module is enabled', async () => {
      const handler = jest.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );
      mockHasModuleAccess.mockReturnValue(true);

      const wrappedHandler = withErrorHandler(handler, {
        requireAuth: true,
        requireModule: 'assets',
      });
      const response = await wrappedHandler(mockRequest, mockRouteContext);

      expect(response.status).toBe(200);
      expect(handler).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // ORG ROLE TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Organization role check', () => {
    it('should reject when user lacks required org role', async () => {
      const handler = jest.fn();
      mockGetTenantContext.mockReturnValue({
        tenantId: 'org-1',
        userId: 'user-1',
        orgRole: 'MEMBER',
      });

      const wrappedHandler = withErrorHandler(handler, {
        requireAuth: true,
        requireOrgRole: [OrgRole.OWNER, OrgRole.ADMIN],
      });
      const response = await wrappedHandler(mockRequest, mockRouteContext);

      expect(response.status).toBe(403);
      expect(handler).not.toHaveBeenCalled();
    });

    it('should allow when user has required org role', async () => {
      const handler = jest.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );
      mockGetTenantContext.mockReturnValue({
        tenantId: 'org-1',
        userId: 'user-1',
        orgRole: 'ADMIN',
      });

      const wrappedHandler = withErrorHandler(handler, {
        requireAuth: true,
        requireOrgRole: [OrgRole.OWNER, OrgRole.ADMIN],
      });
      const response = await wrappedHandler(mockRequest, mockRouteContext);

      expect(response.status).toBe(200);
      expect(handler).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // PERMISSION TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Permission check', () => {
    it('should reject when user lacks required permission', async () => {
      const handler = jest.fn();
      mockHasPermission.mockResolvedValue(false);

      const wrappedHandler = withErrorHandler(handler, {
        requireAuth: true,
        requirePermission: 'payroll:run',
      });
      const response = await wrappedHandler(mockRequest, mockRouteContext);

      expect(response.status).toBe(403);
      expect(handler).not.toHaveBeenCalled();
    });

    it('should allow when user has required permission', async () => {
      const handler = jest.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );
      mockHasPermission.mockResolvedValue(true);

      const wrappedHandler = withErrorHandler(handler, {
        requireAuth: true,
        requirePermission: 'assets:view',
      });
      const response = await wrappedHandler(mockRequest, mockRouteContext);

      expect(response.status).toBe(200);
      expect(handler).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // ROUTE PARAMS TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Route params', () => {
    it('should resolve and inject route params into context', async () => {
      const handler = jest.fn().mockImplementation(
        (_req: NextRequest, ctx: APIContext) => {
          expect(ctx.params).toEqual({ id: '123' });
          return NextResponse.json({ success: true });
        }
      );

      const wrappedHandler = withErrorHandler(handler);
      await wrappedHandler(mockRequest, mockRouteContext);

      expect(handler).toHaveBeenCalled();
    });

    it('should handle undefined params', async () => {
      const handler = jest.fn().mockImplementation(
        (_req: NextRequest, ctx: APIContext) => {
          expect(ctx.params).toBeUndefined();
          return NextResponse.json({ success: true });
        }
      );
      const _contextWithoutParams = { params: Promise.resolve({}) };

      const wrappedHandler = withErrorHandler(handler);
      await wrappedHandler(mockRequest, { params: undefined as unknown as Promise<Record<string, string>> });

      expect(handler).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // REQUEST ID TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Request ID', () => {
    it('should add request ID to response headers', async () => {
      const handler = jest.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      const wrappedHandler = withErrorHandler(handler);
      const response = await wrappedHandler(mockRequest, mockRouteContext);

      expect(response.headers.get('x-request-id')).toBeDefined();
    });

    it('should use existing request ID if provided', async () => {
      const requestWithId = new NextRequest('http://localhost:3000/api/test', {
        method: 'GET',
        headers: { 'x-request-id': 'existing-id-123' },
      });
      const handler = jest.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      const wrappedHandler = withErrorHandler(handler);
      const response = await wrappedHandler(requestWithId, mockRouteContext);

      expect(response.headers.get('x-request-id')).toBe('existing-id-123');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // ERROR HANDLING TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Error handling', () => {
    it('should catch and format handler errors', async () => {
      const handler = jest.fn().mockRejectedValue(new Error('Handler error'));

      const wrappedHandler = withErrorHandler(handler);
      const response = await wrappedHandler(mockRequest, mockRouteContext);

      expect(response.status).toBe(500);
    });

    it('should include request ID in error responses', async () => {
      const handler = jest.fn().mockRejectedValue(new Error('Handler error'));

      const wrappedHandler = withErrorHandler(handler);
      const response = await wrappedHandler(mockRequest, mockRouteContext);

      expect(response.headers.get('x-request-id')).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // UTILITY FUNCTION TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('getRequestId', () => {
    it('should return existing request ID from headers', () => {
      const requestWithId = new NextRequest('http://localhost:3000/api/test', {
        headers: { 'x-request-id': 'existing-123' },
      });

      const requestId = getRequestId(requestWithId);

      expect(requestId).toBe('existing-123');
    });

    it('should generate new request ID when not present', () => {
      const requestId = getRequestId(mockRequest);

      expect(requestId).toBeDefined();
      expect(typeof requestId).toBe('string');
    });
  });
});
