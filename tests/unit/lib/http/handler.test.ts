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
  errorResponse: jest.fn().mockImplementation((
    errorTitle: string,
    status: number,
    options?: { message?: string; code?: string; details?: Record<string, unknown> }
  ) => {
    return new NextResponse(JSON.stringify({
      error: errorTitle,
      message: options?.message,
      code: options?.code,
    }), { status });
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
  deriveOrgRole: jest.fn().mockReturnValue('MEMBER'),
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
import { isTokenRevoked } from '@/lib/security/impersonation';
import { withErrorHandler, getRequestId, APIContext } from '@/lib/http/handler';

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockCheckRateLimit = checkRateLimit as jest.MockedFunction<typeof checkRateLimit>;
const mockGetTenantContext = getTenantContextFromHeaders as jest.MockedFunction<typeof getTenantContextFromHeaders>;
const mockHasModuleAccess = hasModuleAccess as jest.MockedFunction<typeof hasModuleAccess>;
const mockHasPermission = hasPermission as jest.MockedFunction<typeof hasPermission>;
const mockIsTokenRevoked = isTokenRevoked as jest.MockedFunction<typeof isTokenRevoked>;

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

    // Default tenant context (orgRole removed - now using boolean flags on session)
    mockGetTenantContext.mockReturnValue({
      tenantId: 'org-1',
      userId: 'user-1',
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
        user: { id: 'user-1', isAdmin: false },
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
        user: { id: 'user-1', isAdmin: true, organizationId: 'org-1' },
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
  // BODY SIZE VALIDATION TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Body size validation', () => {
    it('should reject requests exceeding body size limit with 413', async () => {
      const handler = jest.fn();
      // Create a POST request with content-length exceeding the default 1MB limit
      const largeRequest = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'content-length': '2097152', // 2MB, exceeds 1MB default
          'content-type': 'application/json',
        },
        body: JSON.stringify({ data: 'test' }),
      });

      // Skip rate limiting to isolate body size check
      const wrappedHandler = withErrorHandler(handler, { skipRateLimit: true });
      const response = await wrappedHandler(largeRequest, mockRouteContext);

      expect(response.status).toBe(413);
      expect(handler).not.toHaveBeenCalled();

      const body = await response.json();
      expect(body.error).toBe('Payload Too Large');
      expect(body.message).toContain('exceeds maximum size');
    });

    it('should allow requests within body size limit', async () => {
      const handler = jest.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );
      const normalRequest = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'content-length': '1024', // 1KB, well under limit
          'content-type': 'application/json',
        },
        body: JSON.stringify({ data: 'test' }),
      });

      // Skip rate limiting to isolate body size check
      const wrappedHandler = withErrorHandler(handler, { skipRateLimit: true });
      const response = await wrappedHandler(normalRequest, mockRouteContext);

      expect(response.status).toBe(200);
      expect(handler).toHaveBeenCalled();
    });

    it('should respect custom maxBodySize option', async () => {
      const handler = jest.fn();
      // Create a request that's under default limit but over custom limit
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'content-length': '51200', // 50KB
          'content-type': 'application/json',
        },
        body: JSON.stringify({ data: 'test' }),
      });

      // Set custom max body size to 10KB, skip rate limiting
      const wrappedHandler = withErrorHandler(handler, { maxBodySize: 10240, skipRateLimit: true });
      const response = await wrappedHandler(request, mockRouteContext);

      expect(response.status).toBe(413);
      expect(handler).not.toHaveBeenCalled();
    });

    it('should skip body size check when skipBodySizeCheck is true', async () => {
      const handler = jest.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );
      const largeRequest = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'content-length': '10485760', // 10MB
          'content-type': 'application/json',
        },
        body: JSON.stringify({ data: 'test' }),
      });

      // Skip both body size and rate limit checks
      const wrappedHandler = withErrorHandler(handler, { skipBodySizeCheck: true, skipRateLimit: true });
      const response = await wrappedHandler(largeRequest, mockRouteContext);

      expect(response.status).toBe(200);
      expect(handler).toHaveBeenCalled();
    });

    it('should not check body size for GET requests', async () => {
      const handler = jest.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );
      // GET request with large content-length header (unusual but shouldn't be blocked)
      const getRequest = new NextRequest('http://localhost:3000/api/test', {
        method: 'GET',
        headers: {
          'content-length': '10485760', // 10MB
        },
      });

      const wrappedHandler = withErrorHandler(handler);
      const response = await wrappedHandler(getRequest, mockRouteContext);

      expect(response.status).toBe(200);
      expect(handler).toHaveBeenCalled();
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
  // OWNER ROLE TESTS (using boolean flags)
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Owner role check (boolean flags)', () => {
    it('should reject non-owner when owner required', async () => {
      const handler = jest.fn();
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1', isOwner: false, organizationId: 'org-1' },
      });

      const wrappedHandler = withErrorHandler(handler, {
        requireOwner: true,
      });
      const response = await wrappedHandler(mockRequest, mockRouteContext);

      expect(response.status).toBe(403);
      expect(handler).not.toHaveBeenCalled();
    });

    it('should allow owner when owner required', async () => {
      const handler = jest.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1', isOwner: true, organizationId: 'org-1' },
      });

      const wrappedHandler = withErrorHandler(handler, {
        requireOwner: true,
      });
      const response = await wrappedHandler(mockRequest, mockRouteContext);

      expect(response.status).toBe(200);
      expect(handler).toHaveBeenCalled();
    });

    it('should allow owner when admin required (owner implies admin)', async () => {
      const handler = jest.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1', isOwner: true, isAdmin: false, organizationId: 'org-1' },
      });

      const wrappedHandler = withErrorHandler(handler, {
        requireAdmin: true,
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
  // IMPERSONATION TOKEN REVOCATION TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Impersonation token revocation', () => {
    it('should return 401 and clear cookie when impersonation token is revoked', async () => {
      const handler = jest.fn();

      // Set up impersonation headers
      const impersonationRequest = new NextRequest('http://localhost:3000/api/test', {
        method: 'GET',
        headers: {
          'x-impersonating': 'true',
          'x-impersonation-jti': 'revoked-token-123',
          'x-impersonator-id': 'super-admin-1',
          'x-impersonation-iat': String(Math.floor(Date.now() / 1000)),
        },
      });

      // Mock token as revoked
      mockIsTokenRevoked.mockResolvedValue(true);

      const wrappedHandler = withErrorHandler(handler, { requireAuth: true });
      const response = await wrappedHandler(impersonationRequest, mockRouteContext);

      // Should return 401
      expect(response.status).toBe(401);
      expect(handler).not.toHaveBeenCalled();

      // Should have request ID header
      expect(response.headers.get('x-request-id')).toBeDefined();

      // Should clear the impersonation cookie
      const setCookieHeader = response.headers.get('set-cookie');
      expect(setCookieHeader).toContain('durj-impersonation=');
      expect(setCookieHeader).toContain('Max-Age=0');

      // Should have appropriate error message
      const body = await response.json();
      expect(body.error).toBe('Unauthorized');
      expect(body.message).toContain('revoked');
    });

    it('should allow request when impersonation token is valid', async () => {
      const handler = jest.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      // Set up impersonation headers
      const impersonationRequest = new NextRequest('http://localhost:3000/api/test', {
        method: 'GET',
        headers: {
          'x-impersonating': 'true',
          'x-impersonation-jti': 'valid-token-123',
          'x-impersonator-id': 'super-admin-1',
          'x-impersonation-iat': String(Math.floor(Date.now() / 1000)),
        },
      });

      // Mock token as valid (not revoked)
      mockIsTokenRevoked.mockResolvedValue(false);

      const wrappedHandler = withErrorHandler(handler, { requireAuth: true });
      const response = await wrappedHandler(impersonationRequest, mockRouteContext);

      expect(response.status).toBe(200);
      expect(handler).toHaveBeenCalled();
    });

    it('should not check revocation when not impersonating', async () => {
      const handler = jest.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      // Regular request without impersonation headers
      const wrappedHandler = withErrorHandler(handler, { requireAuth: true });
      const response = await wrappedHandler(mockRequest, mockRouteContext);

      expect(response.status).toBe(200);
      expect(handler).toHaveBeenCalled();
      // isTokenRevoked should not be called for non-impersonation requests
      expect(mockIsTokenRevoked).not.toHaveBeenCalled();
    });

    it('should not check revocation when jti is missing', async () => {
      const handler = jest.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      // Impersonation flag but no jti
      const requestWithoutJti = new NextRequest('http://localhost:3000/api/test', {
        method: 'GET',
        headers: {
          'x-impersonating': 'true',
          // No x-impersonation-jti header
        },
      });

      const wrappedHandler = withErrorHandler(handler, { requireAuth: true });
      const response = await wrappedHandler(requestWithoutJti, mockRouteContext);

      expect(response.status).toBe(200);
      expect(handler).toHaveBeenCalled();
      // isTokenRevoked should not be called without jti
      expect(mockIsTokenRevoked).not.toHaveBeenCalled();
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
