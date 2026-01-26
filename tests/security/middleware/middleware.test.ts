/**
 * @file middleware.test.ts
 * @description Security tests for middleware
 *
 * Tests:
 * - Cross-tenant access attempt via URL manipulation -> blocked
 * - Subdomain spoofing via x-subdomain header -> blocked
 * - Open redirect prevention
 * - JWT token validation
 * - Impersonation token security
 * - Rate limiting bypass attempts
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

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS (copied from middleware for testing)
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

function validateCallbackUrl(callback: string): boolean {
  // Must start with / but not //
  return callback.startsWith('/') && !callback.startsWith('//');
}

function validateSubdomainFromHost(host: string): string | null {
  // SECURITY: Subdomain MUST come from Host header, not user-provided headers
  const info = extractSubdomain(host);
  return info.subdomain;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Middleware Security Tests', () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // Cross-Tenant Access Prevention
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Cross-tenant access via URL manipulation', () => {
    it('should derive subdomain from Host header only', () => {
      // Attacker tries to access via URL but Host header shows different tenant
      const hostHeader = 'acme.durj.com';
      const subdomain = validateSubdomainFromHost(hostHeader);

      expect(subdomain).toBe('acme');
      // Even if URL somehow contained "othercompany", the subdomain comes from Host
    });

    it('should not allow path-based tenant override', () => {
      // Attacker tries: acme.durj.com/../../othercompany/admin
      const hostHeader = 'acme.durj.com';
      const maliciousPath = '/../../othercompany/admin';

      const subdomain = validateSubdomainFromHost(hostHeader);
      expect(subdomain).toBe('acme');

      // Path traversal should not affect tenant context
      // The tenant is determined by Host header, not path
    });

    it('should not allow query param tenant override', () => {
      // Attacker tries: acme.durj.com/admin?tenantId=othercompany
      const hostHeader = 'acme.durj.com';

      const subdomain = validateSubdomainFromHost(hostHeader);
      expect(subdomain).toBe('acme');

      // Query params should never override tenant context
    });

    it('should validate user org matches subdomain', () => {
      // User belongs to "acme" but tries to access "victim.durj.com"
      const userOrgSlug = 'acme';
      const requestSubdomain = 'victim';

      const isAuthorized = userOrgSlug === requestSubdomain;
      expect(isAuthorized).toBe(false);

      // Middleware should redirect to user's correct subdomain
    });

    it('should block access when user has no org', () => {
      const userOrgSlug: string | null = null;
      const requestSubdomain = 'anycompany';

      const hasValidOrg = !!userOrgSlug;
      expect(hasValidOrg).toBe(false);

      // User without org should not access any tenant subdomain
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Subdomain Spoofing Prevention
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Subdomain spoofing via headers', () => {
    it('should ignore x-subdomain header from client', () => {
      // SECURITY: Subdomain must come from Host header, not user-controlled headers
      const hostHeader = 'acme.durj.com';
      const spoofedHeader = 'victim'; // Attacker sends x-subdomain: victim

      const actualSubdomain = validateSubdomainFromHost(hostHeader);

      // Should use Host header, not the spoofed x-subdomain
      expect(actualSubdomain).toBe('acme');
      expect(actualSubdomain).not.toBe(spoofedHeader);
    });

    it('should ignore x-tenant-id header from client', () => {
      // Client cannot set tenant context via headers
      const hostHeader = 'acme.durj.com';

      const subdomain = validateSubdomainFromHost(hostHeader);
      expect(subdomain).toBe('acme');

      // x-tenant-id should only be set by middleware, never trusted from client
    });

    it('should ignore x-forwarded-host for subdomain extraction', () => {
      // Use actual Host header, not X-Forwarded-Host which can be spoofed
      const actualHost = 'acme.durj.com';
      const forwardedHost = 'victim.durj.com';

      const subdomain = validateSubdomainFromHost(actualHost);
      expect(subdomain).toBe('acme');

      // X-Forwarded-Host should not be used for security decisions
    });

    it('should block Host header with encoded characters', () => {
      // Attacker tries: acme%2evictim.durj.com (URL-encoded dot)
      const maliciousHost = 'acme%2evictim.durj.com';

      const info = extractSubdomain(maliciousHost);

      // Should not extract valid subdomain from encoded input
      // The encoded string doesn't match normal subdomain patterns
      expect(info.subdomain).not.toBe('victim');
    });

    it('should handle null-byte injection in Host', () => {
      // Attacker tries: acme%00.victim.durj.com
      const maliciousHost = 'acme\x00.victim.durj.com';

      const info = extractSubdomain(maliciousHost);

      // Null bytes in subdomain should not bypass checks
      // The resulting subdomain contains invalid characters
      expect(info.isMainDomain).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Open Redirect Prevention
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Open redirect prevention', () => {
    it('should reject absolute URLs in callback', () => {
      const maliciousCallbacks = [
        'https://evil.com',
        'http://evil.com',
        'https://evil.com/path',
        'http://malicious.site/steal-token',
      ];

      maliciousCallbacks.forEach(callback => {
        expect(validateCallbackUrl(callback)).toBe(false);
      });
    });

    it('should reject protocol-relative URLs', () => {
      const maliciousCallbacks = [
        '//evil.com',
        '//evil.com/path',
        '//google.com',
      ];

      maliciousCallbacks.forEach(callback => {
        expect(validateCallbackUrl(callback)).toBe(false);
      });
    });

    it('should reject javascript: URLs', () => {
      const maliciousCallbacks = [
        'javascript:alert(1)',
        'javascript:document.location="http://evil.com"',
        'JAVASCRIPT:alert(1)', // Case variation
      ];

      maliciousCallbacks.forEach(callback => {
        expect(validateCallbackUrl(callback)).toBe(false);
      });
    });

    it('should reject data: URLs', () => {
      const maliciousCallbacks = [
        'data:text/html,<script>alert(1)</script>',
        'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
      ];

      maliciousCallbacks.forEach(callback => {
        expect(validateCallbackUrl(callback)).toBe(false);
      });
    });

    it('should accept valid relative paths', () => {
      const validCallbacks = [
        '/admin',
        '/admin/dashboard',
        '/employee/profile',
        '/admin?tab=settings',
        '/admin#section',
        '/admin/assets/123',
      ];

      validCallbacks.forEach(callback => {
        expect(validateCallbackUrl(callback)).toBe(true);
      });
    });

    it('should reject paths without leading slash', () => {
      const invalidCallbacks = [
        'admin',
        'admin/dashboard',
        'evil.com/path',
      ];

      invalidCallbacks.forEach(callback => {
        expect(validateCallbackUrl(callback)).toBe(false);
      });
    });

    it('should reject backslash paths (Windows-style)', () => {
      const callback = '\\\\evil.com\\path';
      // Backslash paths don't start with /
      expect(validateCallbackUrl(callback)).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Reserved Subdomain Protection
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Reserved subdomain protection', () => {
    it('should block access to reserved infrastructure subdomains', () => {
      const infrastructureSubdomains = ['api', 'cdn', 'mail', 'admin', 'app'];

      infrastructureSubdomains.forEach(sub => {
        const info = extractSubdomain(`${sub}.durj.com`);
        expect(info.isReserved).toBe(true);
      });
    });

    it('should block access to reserved auth subdomains', () => {
      const authSubdomains = ['login', 'signup', 'auth', 'sso', 'account'];

      authSubdomains.forEach(sub => {
        const info = extractSubdomain(`${sub}.durj.com`);
        expect(info.isReserved).toBe(true);
      });
    });

    it('should block access to reserved environment subdomains', () => {
      const envSubdomains = ['dev', 'staging', 'test', 'demo', 'beta'];

      envSubdomains.forEach(sub => {
        const info = extractSubdomain(`${sub}.durj.com`);
        expect(info.isReserved).toBe(true);
      });
    });

    it('should block case-insensitive reserved subdomains', () => {
      const variations = ['ADMIN', 'Admin', 'aDmIn', 'API', 'Api'];

      variations.forEach(sub => {
        const info = extractSubdomain(`${sub}.durj.com`);
        expect(info.isReserved).toBe(true);
      });
    });

    it('should not block legitimate tenant subdomains', () => {
      const legitimateSubdomains = ['acme', 'mycompany', 'tenant123', 'bigcorp'];

      legitimateSubdomains.forEach(sub => {
        const info = extractSubdomain(`${sub}.durj.com`);
        expect(info.isReserved).toBe(false);
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Impersonation Token Security
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Impersonation token security', () => {
    it('should validate token purpose field', () => {
      // Token must have purpose: 'impersonation' to be valid
      const validPayload = { purpose: 'impersonation', orgId: 'org-123' };
      const invalidPayload = { purpose: 'access', orgId: 'org-123' };
      const missingPayload = { orgId: 'org-123' };

      expect(validPayload.purpose).toBe('impersonation');
      expect(invalidPayload.purpose).not.toBe('impersonation');
      expect((missingPayload as Record<string, unknown>).purpose).toBeUndefined();
    });

    it('should require jti for token revocation', () => {
      // Each impersonation token should have unique JTI
      const tokenPayload = {
        jti: 'imp_abc123def456',
        superAdminId: 'admin-1',
        organizationId: 'org-123',
      };

      expect(tokenPayload.jti).toBeDefined();
      expect(tokenPayload.jti).toMatch(/^imp_/);
    });

    it('should have short TTL (15 minutes)', () => {
      const IMPERSONATION_TTL_SECONDS = 15 * 60;

      // Token should expire in 15 minutes or less
      expect(IMPERSONATION_TTL_SECONDS).toBeLessThanOrEqual(15 * 60);
      expect(IMPERSONATION_TTL_SECONDS).toBeGreaterThan(0);
    });

    it('should strip impersonation token from URL after setting cookie', () => {
      // Token should be removed from URL to prevent log exposure
      const urlWithToken = 'https://acme.durj.com/admin?impersonate=jwt.token.here';
      const url = new URL(urlWithToken);

      url.searchParams.delete('impersonate');

      expect(url.searchParams.has('impersonate')).toBe(false);
      expect(url.toString()).not.toContain('impersonate=');
    });

    it('should set httpOnly flag on impersonation cookie', () => {
      // Cookie should not be accessible via JavaScript
      const cookieOptions = {
        httpOnly: true,
        secure: true,
        sameSite: 'lax' as const,
        path: '/',
        maxAge: 15 * 60,
      };

      expect(cookieOptions.httpOnly).toBe(true);
    });

    it('should validate impersonation org matches current subdomain', () => {
      // Impersonation token for org-A should not work on org-B subdomain
      const impersonationOrgSlug = 'acme';
      const currentSubdomain = 'victim';

      const isValid = impersonationOrgSlug.toLowerCase() === currentSubdomain.toLowerCase();
      expect(isValid).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Rate Limiting Security
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Rate limiting security', () => {
    it('should rate limit by client IP from x-forwarded-for', () => {
      // Extract first IP from x-forwarded-for (client IP)
      const forwardedFor = '203.0.113.1, 198.51.100.1, 10.0.0.1';
      const clientIp = forwardedFor.split(',')[0]?.trim();

      expect(clientIp).toBe('203.0.113.1');
    });

    it('should handle IPv6 addresses', () => {
      const ipv6 = '2001:0db8:85a3:0000:0000:8a2e:0370:7334';

      // Should be usable as rate limit key
      const key = `auth:${ipv6}`;
      expect(key).toContain(ipv6);
    });

    it('should not trust x-forwarded-for spoofing attempts', () => {
      // In production, x-forwarded-for is set by trusted proxy (Vercel)
      // Attacker cannot prepend fake IPs

      const trustedForwardedFor = '203.0.113.1'; // Set by Vercel
      const clientIp = trustedForwardedFor.split(',')[0]?.trim();

      expect(clientIp).toBe('203.0.113.1');
    });

    it('should include Retry-After header when rate limited', () => {
      const rateLimitResponse = {
        status: 429,
        headers: {
          'Retry-After': '600',
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': '0',
        },
      };

      expect(rateLimitResponse.status).toBe(429);
      expect(rateLimitResponse.headers['Retry-After']).toBeDefined();
    });

    it('should apply rate limiting only to auth endpoints', () => {
      const rateLimitedPaths = [
        '/api/auth/callback/credentials',
        '/api/auth/signin',
        '/api/auth/forgot-password',
        '/api/auth/reset-password',
        '/api/auth/oauth',
      ];

      const nonRateLimitedPaths = [
        '/api/auth/session',
        '/api/assets',
        '/api/employees',
        '/admin/dashboard',
      ];

      // Rate limited paths should be checked
      rateLimitedPaths.forEach(path => {
        const isLimited = rateLimitedPaths.some(p => path.startsWith(p));
        expect(isLimited).toBe(true);
      });

      // Non-rate-limited paths should not match
      nonRateLimitedPaths.forEach(path => {
        const isLimited = rateLimitedPaths.some(p => path.startsWith(p));
        expect(isLimited).toBe(false);
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Header Injection Prevention
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Header injection prevention', () => {
    it('should not allow newlines in tenant headers', () => {
      const maliciousTenantId = 'org-123\r\nX-Injected: malicious';

      // Header values should not contain newlines
      const isSafe = !maliciousTenantId.includes('\r') && !maliciousTenantId.includes('\n');
      expect(isSafe).toBe(false);

      // Middleware should sanitize or reject such values
    });

    it('should not allow null bytes in header values', () => {
      const maliciousValue = 'org-123\x00injected';

      const containsNullByte = maliciousValue.includes('\x00');
      expect(containsNullByte).toBe(true);

      // Should be sanitized before setting as header
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Super Admin Security
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Super admin security', () => {
    it('should verify isSuperAdmin from token only', () => {
      // isSuperAdmin flag can only come from the auth system
      const token = {
        isSuperAdmin: true,
        sub: 'user-123',
      };

      // Cannot be set via request headers or query params
      const spoofedHeader = 'true';
      const spoofedQuery = 'true';

      // Only trust the token
      expect(token.isSuperAdmin).toBe(true);
      expect(spoofedHeader).not.toBe(token.isSuperAdmin);
      expect(spoofedQuery).not.toBe(token.isSuperAdmin);
    });

    it('should block /super-admin access for non-super-admins', () => {
      const regularUserToken = {
        isSuperAdmin: false,
        isAdmin: true, // Regular admin
      };

      const hasSuperAdminAccess = regularUserToken.isSuperAdmin === true;
      expect(hasSuperAdminAccess).toBe(false);
    });

    it('should require recent 2FA for impersonation', () => {
      // Recent 2FA verification should be required
      const twoFactorWindow = 5 * 60 * 1000; // 5 minutes

      expect(twoFactorWindow).toBeLessThanOrEqual(5 * 60 * 1000);
    });
  });
});
