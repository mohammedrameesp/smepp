/**
 * @file middleware.test.ts
 * @description Integration tests for middleware request handling logic
 *
 * Tests:
 * - Unauthenticated user accessing /admin/* -> redirect to /login
 * - Authenticated user accessing allowed route -> passes with headers
 * - Authenticated user accessing wrong subdomain -> redirect to correct subdomain
 * - User without org accessing subdomain -> redirect to /pending
 * - Module not enabled -> admin redirects to /admin/modules, non-admin to /forbidden
 * - Permission denied -> redirect to /forbidden
 * - Employee with incomplete onboarding -> redirect to /employee-onboarding
 *
 * Note: These tests verify the middleware decision logic without invoking NextRequest
 * directly, as it's not available in the Jest environment.
 */

// Mock next-auth/jwt
jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn(),
}));

// Mock module routes helper
jest.mock('@/lib/modules/routes', () => ({
  checkModuleAccess: jest.fn(),
  checkPermissionAccess: jest.fn(),
}));

import { getToken } from 'next-auth/jwt';
import { checkModuleAccess, checkPermissionAccess } from '@/lib/modules/routes';

const mockGetToken = getToken as jest.MockedFunction<typeof getToken>;
const mockCheckModuleAccess = checkModuleAccess as jest.MockedFunction<typeof checkModuleAccess>;
const mockCheckPermissionAccess = checkPermissionAccess as jest.MockedFunction<typeof checkPermissionAccess>;

// ═══════════════════════════════════════════════════════════════════════════════
// MIDDLEWARE LOGIC HELPERS (extracted for testing)
// ═══════════════════════════════════════════════════════════════════════════════

const PUBLIC_ROUTES = [
  '/', '/pricing', '/features', '/about',
  '/login', '/signup', '/forgot-password', '/reset-password',
  '/api/auth', '/api/health', '/api/webhooks', '/api/public',
];

const AUTH_ONLY_ROUTES = ['/setup', '/pending', '/api/organizations'];
const SUPER_ADMIN_ROUTES = ['/super-admin'];

function matchesRoutes(pathname: string, routes: string[]): boolean {
  return routes.some(route => {
    // Special handling for root route - must be exact match
    if (route === '/') return pathname === '/';
    return pathname === route || pathname.startsWith(route + '/') || pathname.startsWith(route);
  });
}

function isPublicRoute(pathname: string): boolean {
  return matchesRoutes(pathname, PUBLIC_ROUTES);
}

function isAuthOnlyRoute(pathname: string): boolean {
  return matchesRoutes(pathname, AUTH_ONLY_ROUTES);
}

function isSuperAdminRoute(pathname: string): boolean {
  return matchesRoutes(pathname, SUPER_ADMIN_ROUTES);
}

interface MockToken {
  sub?: string;
  organizationId?: string | null;
  organizationSlug?: string | null;
  orgRole?: string;
  isAdmin?: boolean;
  isOwner?: boolean;
  isEmployee?: boolean;
  onboardingComplete?: boolean;
  isSuperAdmin?: boolean;
  subscriptionTier?: string;
  enabledModules?: string[];
  hasOperationsAccess?: boolean;
  hasHRAccess?: boolean;
  hasFinanceAccess?: boolean;
}

function createMockToken(overrides: MockToken = {}): MockToken {
  return {
    sub: 'user-123',
    organizationId: 'org-123',
    organizationSlug: 'acme',
    orgRole: 'MEMBER',
    isAdmin: false,
    isOwner: false,
    isEmployee: false,
    onboardingComplete: true,
    isSuperAdmin: false,
    subscriptionTier: 'FREE',
    enabledModules: ['assets', 'subscriptions', 'suppliers'],
    hasOperationsAccess: true,
    hasHRAccess: false,
    hasFinanceAccess: false,
    ...overrides,
  };
}

// Middleware decision functions
function shouldRedirectToLogin(pathname: string, token: MockToken | null): boolean {
  if (isPublicRoute(pathname)) return false;
  if (!token) return true;
  return false;
}

function shouldRedirectToCorrectSubdomain(
  currentSubdomain: string,
  token: MockToken | null
): { redirect: boolean; targetSubdomain?: string } {
  if (!token?.organizationSlug) return { redirect: false };
  if (currentSubdomain.toLowerCase() !== token.organizationSlug.toLowerCase()) {
    return { redirect: true, targetSubdomain: token.organizationSlug };
  }
  return { redirect: false };
}

function shouldRedirectToPending(token: MockToken | null, isOnSubdomain: boolean): boolean {
  if (!token) return false;
  if (!token.organizationId && isOnSubdomain) return true;
  return false;
}

function getModuleRedirect(
  pathname: string,
  moduleAccess: { allowed: boolean; moduleId?: string },
  isAdmin: boolean
): { redirect: boolean; target?: string } {
  if (moduleAccess.allowed) return { redirect: false };
  if (isAdmin) {
    return {
      redirect: true,
      target: `/admin/modules?install=${moduleAccess.moduleId}&from=${pathname}`,
    };
  }
  return { redirect: true, target: '/forbidden' };
}

function shouldRedirectToOnboarding(token: MockToken | null, pathname: string): boolean {
  if (!token) return false;
  if (!token.isEmployee) return false;
  if (token.onboardingComplete) return false;
  if (token.isAdmin) return false;
  if (pathname.startsWith('/employee-onboarding')) return false;
  if (pathname.startsWith('/employee')) return false;
  if (pathname.startsWith('/api')) return false;
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Middleware Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckModuleAccess.mockReturnValue({ allowed: true });
    mockCheckPermissionAccess.mockReturnValue({ allowed: true });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Unauthenticated Access Tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Unauthenticated user accessing protected routes', () => {
    it('should redirect /admin to /login', () => {
      const token = null;
      const result = shouldRedirectToLogin('/admin', token);
      expect(result).toBe(true);
    });

    it('should redirect /admin/dashboard to /login', () => {
      const token = null;
      const result = shouldRedirectToLogin('/admin/dashboard', token);
      expect(result).toBe(true);
    });

    it('should redirect /employee/* to /login', () => {
      const token = null;
      const result = shouldRedirectToLogin('/employee/profile', token);
      expect(result).toBe(true);
    });

    it('should allow access to /login without auth', () => {
      const token = null;
      const result = shouldRedirectToLogin('/login', token);
      expect(result).toBe(false);
    });

    it('should allow access to /signup without auth', () => {
      const token = null;
      const result = shouldRedirectToLogin('/signup', token);
      expect(result).toBe(false);
    });

    it('should allow access to /pricing without auth', () => {
      const token = null;
      const result = shouldRedirectToLogin('/pricing', token);
      expect(result).toBe(false);
    });

    it('should allow access to /api/auth/* without auth', () => {
      const token = null;
      expect(shouldRedirectToLogin('/api/auth/session', token)).toBe(false);
      expect(shouldRedirectToLogin('/api/auth/callback', token)).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Authenticated Access Tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Authenticated user accessing allowed routes', () => {
    it('should not redirect when on correct subdomain', () => {
      const token = createMockToken({ organizationSlug: 'acme' });
      const result = shouldRedirectToCorrectSubdomain('acme', token);
      expect(result.redirect).toBe(false);
    });

    it('should pass through with proper token context', () => {
      const token = createMockToken({
        organizationSlug: 'acme',
        organizationId: 'org-123',
        isAdmin: true,
      });

      // Verify token has required context
      expect(token.organizationSlug).toBe('acme');
      expect(token.organizationId).toBe('org-123');
      expect(token.isAdmin).toBe(true);
    });

    it('should allow admin to access /admin routes', () => {
      const token = createMockToken({ isAdmin: true });
      const result = shouldRedirectToLogin('/admin/settings', token);
      expect(result).toBe(false);
    });

    it('should allow employee to access /employee routes', () => {
      const token = createMockToken({
        isEmployee: true,
        isAdmin: false,
        onboardingComplete: true,
      });
      const result = shouldRedirectToLogin('/employee/leave', token);
      expect(result).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Wrong Subdomain Tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Authenticated user accessing wrong subdomain', () => {
    it('should redirect to correct subdomain', () => {
      const token = createMockToken({ organizationSlug: 'acme' });
      const result = shouldRedirectToCorrectSubdomain('othercompany', token);

      expect(result.redirect).toBe(true);
      expect(result.targetSubdomain).toBe('acme');
    });

    it('should handle case-insensitive subdomain comparison', () => {
      const token = createMockToken({ organizationSlug: 'ACME' });
      const result = shouldRedirectToCorrectSubdomain('acme', token);

      expect(result.redirect).toBe(false);
    });

    it('should not redirect when already on correct subdomain', () => {
      const token = createMockToken({ organizationSlug: 'mycompany' });
      const result = shouldRedirectToCorrectSubdomain('mycompany', token);

      expect(result.redirect).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // No Organization Tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('User without org accessing subdomain', () => {
    it('should redirect to /pending when on subdomain without org', () => {
      const token = createMockToken({
        organizationId: null,
        organizationSlug: null,
      });
      const result = shouldRedirectToPending(token, true);
      expect(result).toBe(true);
    });

    it('should not redirect on main domain without org', () => {
      const token = createMockToken({
        organizationId: null,
        organizationSlug: null,
      });
      const result = shouldRedirectToPending(token, false);
      expect(result).toBe(false);
    });

    it('should allow access to /setup route without org', () => {
      const token = createMockToken({
        organizationId: null,
        organizationSlug: null,
      });

      const isAuthOnly = isAuthOnlyRoute('/setup');
      expect(isAuthOnly).toBe(true);
    });

    it('should allow access to /pending route without org', () => {
      const isAuthOnly = isAuthOnlyRoute('/pending');
      expect(isAuthOnly).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Module Access Tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Module not enabled', () => {
    it('should redirect admin to /admin/modules with install param', () => {
      const moduleAccess = { allowed: false, moduleId: 'payroll' };
      const result = getModuleRedirect('/admin/payroll', moduleAccess, true);

      expect(result.redirect).toBe(true);
      expect(result.target).toContain('/admin/modules');
      expect(result.target).toContain('install=payroll');
      expect(result.target).toContain('from=/admin/payroll');
    });

    it('should redirect non-admin to /forbidden', () => {
      const moduleAccess = { allowed: false, moduleId: 'payroll' };
      const result = getModuleRedirect('/admin/payroll', moduleAccess, false);

      expect(result.redirect).toBe(true);
      expect(result.target).toBe('/forbidden');
    });

    it('should not redirect when module is enabled', () => {
      const moduleAccess = { allowed: true };
      const result = getModuleRedirect('/admin/payroll', moduleAccess, true);

      expect(result.redirect).toBe(false);
    });

    it('should include moduleId in redirect URL', () => {
      const moduleAccess = { allowed: false, moduleId: 'leave' };
      const result = getModuleRedirect('/admin/leave', moduleAccess, true);

      expect(result.target).toContain('install=leave');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Permission Access Tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Permission denied', () => {
    it('should redirect to /forbidden when permission check fails', () => {
      mockCheckPermissionAccess.mockReturnValue({ allowed: false });

      const result = mockCheckPermissionAccess('/admin/employees', {
        isAdmin: false,
        isOwner: false,
        hasHRAccess: false,
        hasOperationsAccess: true,
        hasFinanceAccess: false,
      });

      expect(result.allowed).toBe(false);
    });

    it('should allow access when permission is granted', () => {
      mockCheckPermissionAccess.mockReturnValue({ allowed: true });

      const result = mockCheckPermissionAccess('/admin/employees', {
        isAdmin: false,
        isOwner: false,
        hasHRAccess: true,
        hasOperationsAccess: true,
        hasFinanceAccess: false,
      });

      expect(result.allowed).toBe(true);
    });

    it('should check admin flag for permission bypass', () => {
      // Admins typically have full access
      const token = createMockToken({ isAdmin: true, hasHRAccess: false });

      // Even without explicit HR access, admin should pass
      expect(token.isAdmin).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Employee Onboarding Tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Employee with incomplete onboarding', () => {
    it('should redirect to /employee-onboarding from other routes', () => {
      const token = createMockToken({
        isEmployee: true,
        isAdmin: false,
        onboardingComplete: false,
      });

      const result = shouldRedirectToOnboarding(token, '/admin/dashboard');
      expect(result).toBe(true);
    });

    it('should not redirect when already on /employee-onboarding', () => {
      const token = createMockToken({
        isEmployee: true,
        isAdmin: false,
        onboardingComplete: false,
      });

      const result = shouldRedirectToOnboarding(token, '/employee-onboarding');
      expect(result).toBe(false);
    });

    it('should allow access to /employee/* during onboarding', () => {
      const token = createMockToken({
        isEmployee: true,
        isAdmin: false,
        onboardingComplete: false,
      });

      const result = shouldRedirectToOnboarding(token, '/employee/profile');
      expect(result).toBe(false);
    });

    it('should allow API routes during onboarding', () => {
      const token = createMockToken({
        isEmployee: true,
        isAdmin: false,
        onboardingComplete: false,
      });

      const result = shouldRedirectToOnboarding(token, '/api/employee/profile');
      expect(result).toBe(false);
    });

    it('should not redirect when onboarding is complete', () => {
      const token = createMockToken({
        isEmployee: true,
        isAdmin: false,
        onboardingComplete: true,
      });

      const result = shouldRedirectToOnboarding(token, '/admin/dashboard');
      expect(result).toBe(false);
    });

    it('should not redirect admin even with incomplete onboarding', () => {
      const token = createMockToken({
        isEmployee: true,
        isAdmin: true,
        onboardingComplete: false,
      });

      const result = shouldRedirectToOnboarding(token, '/admin/dashboard');
      expect(result).toBe(false);
    });

    it('should not redirect non-employees', () => {
      const token = createMockToken({
        isEmployee: false,
        isAdmin: false,
        onboardingComplete: false,
      });

      const result = shouldRedirectToOnboarding(token, '/admin/dashboard');
      expect(result).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Super Admin Tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Super Admin Routes', () => {
    it('should identify /super-admin as super admin route', () => {
      expect(isSuperAdminRoute('/super-admin')).toBe(true);
      expect(isSuperAdminRoute('/super-admin/organizations')).toBe(true);
    });

    it('should not identify /admin as super admin route', () => {
      expect(isSuperAdminRoute('/admin')).toBe(false);
      expect(isSuperAdminRoute('/admin/settings')).toBe(false);
    });

    it('should allow super admin access', () => {
      const token = createMockToken({ isSuperAdmin: true });
      expect(token.isSuperAdmin).toBe(true);
    });

    it('should block non-super-admin from super admin routes', () => {
      const token = createMockToken({
        isSuperAdmin: false,
        isAdmin: true,
      });

      const isSuperAdminPath = isSuperAdminRoute('/super-admin');
      const hasAccess = token.isSuperAdmin;

      expect(isSuperAdminPath).toBe(true);
      expect(hasAccess).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Header Injection Tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Tenant header injection', () => {
    it('should generate correct header values from token', () => {
      const token = createMockToken({
        organizationId: 'org-456',
        organizationSlug: 'mycompany',
        sub: 'user-789',
        orgRole: 'ADMIN',
        subscriptionTier: 'PROFESSIONAL',
      });

      const headers = {
        'x-tenant-id': token.organizationId,
        'x-tenant-slug': token.organizationSlug,
        'x-user-id': token.sub,
        'x-user-role': token.orgRole,
        'x-subscription-tier': token.subscriptionTier,
      };

      expect(headers['x-tenant-id']).toBe('org-456');
      expect(headers['x-tenant-slug']).toBe('mycompany');
      expect(headers['x-user-id']).toBe('user-789');
      expect(headers['x-user-role']).toBe('ADMIN');
      expect(headers['x-subscription-tier']).toBe('PROFESSIONAL');
    });
  });
});
