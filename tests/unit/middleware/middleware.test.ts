/**
 * @file middleware.test.ts
 * @description Unit tests for middleware helper functions
 *
 * Tests:
 * - extractSubdomain() with various hostname formats
 * - Route matching helpers (isPublicRoute, isSuperAdminRoute, etc.)
 * - checkAuthRateLimit() counter increment and window reset
 * - Redirect URL generation (no open redirects)
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION (mirrors middleware.ts)
// ═══════════════════════════════════════════════════════════════════════════════

const APP_DOMAIN = 'durj.com';

const RESERVED_SUBDOMAINS = new Set([
  'www', 'app', 'api', 'admin', 'dashboard',
  'help', 'support', 'docs', 'blog', 'status',
  'mail', 'cdn', 'assets', 'static', 'media',
  'dev', 'staging', 'test', 'demo', 'beta',
  'login', 'signup', 'auth', 'sso', 'account',
  'billing', 'pricing', 'enterprise', 'team', 'org',
  'about', 'contact', 'legal', 'privacy', 'terms', 'platform',
]);

const PUBLIC_ROUTES: readonly string[] = [
  '/',
  '/pricing',
  '/features',
  '/about',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/set-password',
  '/get-started',
  '/verify',
  '/invite',
  '/suppliers/register',
  '/api/auth',
  '/api/health',
  '/api/webhooks',
  '/api/public',
  '/api/invitations',
  '/api/organizations/signup',
  '/api/subdomains',
  '/api/suppliers/register',
  '/api/suppliers/categories',
  '/api/internal',
  '/api/super-admin/auth',
  '/_next',
  '/favicon.ico',
  '/logo.png',
  '/manifest.json',
];

const AUTH_ONLY_ROUTES: readonly string[] = [
  '/setup',
  '/pending',
  '/api/organizations',
];

const SUPER_ADMIN_ROUTES: readonly string[] = [
  '/super-admin',
];

const AUTH_RATE_LIMIT = 10;
const AUTH_RATE_WINDOW_MS = 15 * 60 * 1000;

const AUTH_RATE_LIMITED_PATHS: readonly string[] = [
  '/api/auth/callback/credentials',
  '/api/auth/signin',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/oauth',
];

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS (copied from middleware.ts for isolated testing)
// ═══════════════════════════════════════════════════════════════════════════════

interface SubdomainInfo {
  subdomain: string | null;
  isMainDomain: boolean;
  isReserved: boolean;
  isPotentialCustomDomain: boolean;
  customDomainHost: string | null;
}

function extractSubdomain(host: string): SubdomainInfo {
  const hostWithoutPort = host.split(':')[0];
  const appDomainWithoutPort = APP_DOMAIN.split(':')[0];

  if (
    hostWithoutPort === appDomainWithoutPort ||
    host === APP_DOMAIN ||
    hostWithoutPort === `www.${appDomainWithoutPort}`
  ) {
    return {
      subdomain: null,
      isMainDomain: true,
      isReserved: false,
      isPotentialCustomDomain: false,
      customDomainHost: null,
    };
  }

  const suffix = `.${appDomainWithoutPort}`;
  if (hostWithoutPort.endsWith(suffix)) {
    const subdomain = hostWithoutPort.slice(0, -suffix.length).split('.')[0];
    return {
      subdomain,
      isMainDomain: false,
      isReserved: RESERVED_SUBDOMAINS.has(subdomain.toLowerCase()),
      isPotentialCustomDomain: false,
      customDomainHost: null,
    };
  }

  if (hostWithoutPort.endsWith('.localhost')) {
    const subdomain = hostWithoutPort.replace('.localhost', '');
    return {
      subdomain,
      isMainDomain: false,
      isReserved: RESERVED_SUBDOMAINS.has(subdomain.toLowerCase()),
      isPotentialCustomDomain: false,
      customDomainHost: null,
    };
  }

  return {
    subdomain: null,
    isMainDomain: false,
    isReserved: false,
    isPotentialCustomDomain: true,
    customDomainHost: hostWithoutPort,
  };
}

function matchesRoutes(pathname: string, routes: readonly string[], excludeRoot = false): boolean {
  return routes.some(route => {
    if (excludeRoot && route === '/') return false;
    // Special handling for root route - must be exact match
    if (route === '/') return pathname === '/';
    return pathname === route || pathname.startsWith(route + '/') || pathname.startsWith(route);
  });
}

function isPublicRoute(pathname: string, excludeRoot = false): boolean {
  return matchesRoutes(pathname, PUBLIC_ROUTES, excludeRoot);
}

function isAuthOnlyRoute(pathname: string): boolean {
  return matchesRoutes(pathname, AUTH_ONLY_ROUTES);
}

function isSuperAdminRoute(pathname: string): boolean {
  return matchesRoutes(pathname, SUPER_ADMIN_ROUTES);
}

function isAuthRateLimitedPath(pathname: string): boolean {
  return AUTH_RATE_LIMITED_PATHS.some(path => pathname.startsWith(path));
}

// Rate limiting simulation
const authAttempts = new Map<string, { count: number; resetAt: number }>();

function checkAuthRateLimit(ip: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const key = `auth:${ip}`;
  const record = authAttempts.get(key);

  if (!record || record.resetAt < now) {
    authAttempts.set(key, { count: 1, resetAt: now + AUTH_RATE_WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }

  if (record.count >= AUTH_RATE_LIMIT) {
    const retryAfterSeconds = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, retryAfter: retryAfterSeconds };
  }

  record.count++;
  return { allowed: true, retryAfter: 0 };
}

function validateCallbackUrl(callback: string): boolean {
  return callback.startsWith('/') && !callback.startsWith('//');
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Middleware Unit Tests', () => {
  beforeEach(() => {
    authAttempts.clear();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // extractSubdomain() Tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('extractSubdomain()', () => {
    describe('main domain detection', () => {
      it('should identify main domain without port', () => {
        const result = extractSubdomain('durj.com');
        expect(result.isMainDomain).toBe(true);
        expect(result.subdomain).toBeNull();
      });

      it('should identify main domain with port', () => {
        const result = extractSubdomain('durj.com:3000');
        expect(result.isMainDomain).toBe(true);
        expect(result.subdomain).toBeNull();
      });

      it('should identify www as main domain', () => {
        const result = extractSubdomain('www.durj.com');
        expect(result.isMainDomain).toBe(true);
        expect(result.subdomain).toBeNull();
      });

      it('should identify www with port as main domain', () => {
        const result = extractSubdomain('www.durj.com:443');
        expect(result.isMainDomain).toBe(true);
        expect(result.subdomain).toBeNull();
      });
    });

    describe('subdomain extraction', () => {
      it('should extract simple subdomain', () => {
        const result = extractSubdomain('acme.durj.com');
        expect(result.isMainDomain).toBe(false);
        expect(result.subdomain).toBe('acme');
        expect(result.isReserved).toBe(false);
      });

      it('should extract subdomain with port', () => {
        const result = extractSubdomain('acme.durj.com:3000');
        expect(result.isMainDomain).toBe(false);
        expect(result.subdomain).toBe('acme');
      });

      it('should handle nested subdomains (extract first segment)', () => {
        const result = extractSubdomain('team.acme.durj.com');
        expect(result.subdomain).toBe('team');
      });

      it('should handle numeric subdomains', () => {
        const result = extractSubdomain('123company.durj.com');
        expect(result.subdomain).toBe('123company');
      });

      it('should handle hyphenated subdomains', () => {
        const result = extractSubdomain('my-company.durj.com');
        expect(result.subdomain).toBe('my-company');
      });
    });

    describe('reserved subdomain detection', () => {
      it('should mark www as reserved (when not main domain pattern)', () => {
        // www.durj.com is treated as main domain, but test the reserved set
        expect(RESERVED_SUBDOMAINS.has('www')).toBe(true);
      });

      it('should mark admin as reserved', () => {
        const result = extractSubdomain('admin.durj.com');
        expect(result.isReserved).toBe(true);
      });

      it('should mark api as reserved', () => {
        const result = extractSubdomain('api.durj.com');
        expect(result.isReserved).toBe(true);
      });

      it('should mark staging as reserved', () => {
        const result = extractSubdomain('staging.durj.com');
        expect(result.isReserved).toBe(true);
      });

      it('should be case-insensitive for reserved check', () => {
        const result = extractSubdomain('ADMIN.durj.com');
        expect(result.isReserved).toBe(true);
      });

      it('should not mark valid tenant subdomain as reserved', () => {
        const result = extractSubdomain('mycompany.durj.com');
        expect(result.isReserved).toBe(false);
      });
    });

    describe('localhost development format', () => {
      it('should extract subdomain from localhost format', () => {
        const result = extractSubdomain('acme.localhost');
        expect(result.subdomain).toBe('acme');
        expect(result.isMainDomain).toBe(false);
      });

      it('should extract subdomain from localhost with port', () => {
        const result = extractSubdomain('acme.localhost:3000');
        expect(result.subdomain).toBe('acme');
      });

      it('should detect reserved subdomains in localhost', () => {
        const result = extractSubdomain('admin.localhost:3000');
        expect(result.isReserved).toBe(true);
      });
    });

    describe('custom domain detection', () => {
      it('should identify unknown domain as potential custom domain', () => {
        const result = extractSubdomain('hr.acme.com');
        expect(result.isPotentialCustomDomain).toBe(true);
        expect(result.customDomainHost).toBe('hr.acme.com');
      });

      it('should identify completely different domain as custom', () => {
        const result = extractSubdomain('mycompany.io');
        expect(result.isPotentialCustomDomain).toBe(true);
        expect(result.customDomainHost).toBe('mycompany.io');
      });

      it('should strip port from custom domain host', () => {
        const result = extractSubdomain('hr.acme.com:8080');
        expect(result.customDomainHost).toBe('hr.acme.com');
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Route Matching Tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Route Matching Helpers', () => {
    describe('isPublicRoute()', () => {
      it('should match exact public routes', () => {
        expect(isPublicRoute('/')).toBe(true);
        expect(isPublicRoute('/login')).toBe(true);
        expect(isPublicRoute('/signup')).toBe(true);
        expect(isPublicRoute('/pricing')).toBe(true);
      });

      it('should match public route prefixes', () => {
        expect(isPublicRoute('/api/auth/callback')).toBe(true);
        expect(isPublicRoute('/api/auth/signin')).toBe(true);
        expect(isPublicRoute('/api/health')).toBe(true);
        expect(isPublicRoute('/api/webhooks/stripe')).toBe(true);
      });

      it('should not match protected routes', () => {
        expect(isPublicRoute('/admin')).toBe(false);
        expect(isPublicRoute('/admin/dashboard')).toBe(false);
        expect(isPublicRoute('/employee')).toBe(false);
        expect(isPublicRoute('/api/assets')).toBe(false);
      });

      it('should support excludeRoot option', () => {
        expect(isPublicRoute('/', false)).toBe(true);
        expect(isPublicRoute('/', true)).toBe(false);
      });

      it('should match invite routes', () => {
        expect(isPublicRoute('/invite')).toBe(true);
        expect(isPublicRoute('/invite/abc123')).toBe(true);
      });
    });

    describe('isAuthOnlyRoute()', () => {
      it('should match auth-only routes', () => {
        expect(isAuthOnlyRoute('/setup')).toBe(true);
        expect(isAuthOnlyRoute('/pending')).toBe(true);
        expect(isAuthOnlyRoute('/api/organizations')).toBe(true);
      });

      it('should match auth-only route prefixes', () => {
        expect(isAuthOnlyRoute('/setup/step-1')).toBe(true);
        expect(isAuthOnlyRoute('/api/organizations/create')).toBe(true);
      });

      it('should not match other routes', () => {
        expect(isAuthOnlyRoute('/admin')).toBe(false);
        expect(isAuthOnlyRoute('/login')).toBe(false);
      });
    });

    describe('isSuperAdminRoute()', () => {
      it('should match super admin routes', () => {
        expect(isSuperAdminRoute('/super-admin')).toBe(true);
        expect(isSuperAdminRoute('/super-admin/organizations')).toBe(true);
        expect(isSuperAdminRoute('/super-admin/users')).toBe(true);
      });

      it('should not match regular admin routes', () => {
        expect(isSuperAdminRoute('/admin')).toBe(false);
        expect(isSuperAdminRoute('/admin/settings')).toBe(false);
      });

      it('should not match routes containing super-admin in path', () => {
        // Only prefix matching, not contains
        expect(isSuperAdminRoute('/api/super-admin')).toBe(false);
      });
    });

    describe('isAuthRateLimitedPath()', () => {
      it('should match rate-limited auth paths', () => {
        expect(isAuthRateLimitedPath('/api/auth/callback/credentials')).toBe(true);
        expect(isAuthRateLimitedPath('/api/auth/signin')).toBe(true);
        expect(isAuthRateLimitedPath('/api/auth/forgot-password')).toBe(true);
      });

      it('should not match non-rate-limited paths', () => {
        expect(isAuthRateLimitedPath('/api/auth/session')).toBe(false);
        expect(isAuthRateLimitedPath('/api/auth/providers')).toBe(false);
        expect(isAuthRateLimitedPath('/api/assets')).toBe(false);
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Rate Limiting Tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe('checkAuthRateLimit()', () => {
    describe('counter increment', () => {
      it('should allow first request', () => {
        const result = checkAuthRateLimit('192.168.1.1');
        expect(result.allowed).toBe(true);
        expect(result.retryAfter).toBe(0);
      });

      it('should allow requests up to limit', () => {
        const ip = '192.168.1.2';
        for (let i = 0; i < AUTH_RATE_LIMIT; i++) {
          const result = checkAuthRateLimit(ip);
          expect(result.allowed).toBe(true);
        }
      });

      it('should block requests exceeding limit', () => {
        const ip = '192.168.1.3';
        // Exhaust the limit
        for (let i = 0; i < AUTH_RATE_LIMIT; i++) {
          checkAuthRateLimit(ip);
        }
        // Next request should be blocked
        const result = checkAuthRateLimit(ip);
        expect(result.allowed).toBe(false);
        expect(result.retryAfter).toBeGreaterThan(0);
      });

      it('should track different IPs separately', () => {
        const ip1 = '192.168.1.4';
        const ip2 = '192.168.1.5';

        // Exhaust limit for ip1
        for (let i = 0; i < AUTH_RATE_LIMIT; i++) {
          checkAuthRateLimit(ip1);
        }

        // ip2 should still be allowed
        const result = checkAuthRateLimit(ip2);
        expect(result.allowed).toBe(true);
      });
    });

    describe('window reset', () => {
      it('should reset counter after window expires', () => {
        const ip = '192.168.1.6';

        // Exhaust the limit
        for (let i = 0; i < AUTH_RATE_LIMIT; i++) {
          checkAuthRateLimit(ip);
        }

        // Simulate window expiry by manipulating the record
        const key = `auth:${ip}`;
        const record = authAttempts.get(key);
        if (record) {
          record.resetAt = Date.now() - 1000; // Set to past
        }

        // Should be allowed again
        const result = checkAuthRateLimit(ip);
        expect(result.allowed).toBe(true);
      });
    });

    describe('retryAfter calculation', () => {
      it('should return remaining seconds until reset', () => {
        const ip = '192.168.1.7';

        // Exhaust the limit
        for (let i = 0; i < AUTH_RATE_LIMIT; i++) {
          checkAuthRateLimit(ip);
        }

        const result = checkAuthRateLimit(ip);
        expect(result.retryAfter).toBeGreaterThan(0);
        expect(result.retryAfter).toBeLessThanOrEqual(AUTH_RATE_WINDOW_MS / 1000);
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Redirect URL Validation (Open Redirect Prevention)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Redirect URL Generation (Open Redirect Prevention)', () => {
    describe('validateCallbackUrl()', () => {
      it('should accept valid relative paths', () => {
        expect(validateCallbackUrl('/admin')).toBe(true);
        expect(validateCallbackUrl('/admin/dashboard')).toBe(true);
        expect(validateCallbackUrl('/employee/profile')).toBe(true);
      });

      it('should reject protocol-relative URLs (//)', () => {
        expect(validateCallbackUrl('//evil.com')).toBe(false);
        expect(validateCallbackUrl('//google.com/path')).toBe(false);
      });

      it('should reject absolute URLs', () => {
        expect(validateCallbackUrl('https://evil.com')).toBe(false);
        expect(validateCallbackUrl('http://evil.com')).toBe(false);
      });

      it('should reject URLs without leading slash', () => {
        expect(validateCallbackUrl('admin')).toBe(false);
        expect(validateCallbackUrl('evil.com')).toBe(false);
      });

      it('should accept paths with query strings', () => {
        expect(validateCallbackUrl('/admin?tab=settings')).toBe(true);
      });

      it('should accept paths with fragments', () => {
        expect(validateCallbackUrl('/admin#section')).toBe(true);
      });

      it('should reject javascript: URLs', () => {
        expect(validateCallbackUrl('javascript:alert(1)')).toBe(false);
      });

      it('should reject data: URLs', () => {
        expect(validateCallbackUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Reserved Subdomains Completeness
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Reserved Subdomains', () => {
    it('should include all infrastructure subdomains', () => {
      const infrastructure = ['www', 'app', 'api', 'admin', 'dashboard', 'cdn', 'mail', 'static'];
      infrastructure.forEach(sub => {
        expect(RESERVED_SUBDOMAINS.has(sub)).toBe(true);
      });
    });

    it('should include all auth-related subdomains', () => {
      const auth = ['login', 'signup', 'auth', 'sso', 'account'];
      auth.forEach(sub => {
        expect(RESERVED_SUBDOMAINS.has(sub)).toBe(true);
      });
    });

    it('should include environment subdomains', () => {
      const envs = ['dev', 'staging', 'test', 'demo', 'beta'];
      envs.forEach(sub => {
        expect(RESERVED_SUBDOMAINS.has(sub)).toBe(true);
      });
    });

    it('should include billing/business subdomains', () => {
      const business = ['billing', 'pricing', 'enterprise', 'team', 'org'];
      business.forEach(sub => {
        expect(RESERVED_SUBDOMAINS.has(sub)).toBe(true);
      });
    });
  });
});
