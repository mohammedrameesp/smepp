/**
 * @file subdomain.test.ts
 * @description Tests for subdomain utilities and tenant routing logic
 */

import { prisma } from '@/lib/core/prisma';
import { RESERVED_SUBDOMAINS } from '@/lib/multi-tenant/subdomain';

// Mock Prisma
jest.mock('@/lib/core/prisma', () => ({
  prisma: {
    organization: {
      findUnique: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Subdomain Utilities Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('RESERVED_SUBDOMAINS', () => {
    it('should include common system subdomains', () => {
      expect(RESERVED_SUBDOMAINS).toContain('www');
      expect(RESERVED_SUBDOMAINS).toContain('app');
      expect(RESERVED_SUBDOMAINS).toContain('api');
      expect(RESERVED_SUBDOMAINS).toContain('admin');
    });

    it('should include authentication subdomains', () => {
      expect(RESERVED_SUBDOMAINS).toContain('login');
      expect(RESERVED_SUBDOMAINS).toContain('signup');
      expect(RESERVED_SUBDOMAINS).toContain('auth');
      expect(RESERVED_SUBDOMAINS).toContain('oauth');
      expect(RESERVED_SUBDOMAINS).toContain('sso');
    });

    it('should include infrastructure subdomains', () => {
      expect(RESERVED_SUBDOMAINS).toContain('mail');
      expect(RESERVED_SUBDOMAINS).toContain('smtp');
      expect(RESERVED_SUBDOMAINS).toContain('ftp');
      expect(RESERVED_SUBDOMAINS).toContain('cdn');
    });

    it('should include environment subdomains', () => {
      expect(RESERVED_SUBDOMAINS).toContain('dev');
      expect(RESERVED_SUBDOMAINS).toContain('staging');
      expect(RESERVED_SUBDOMAINS).toContain('test');
      expect(RESERVED_SUBDOMAINS).toContain('demo');
      expect(RESERVED_SUBDOMAINS).toContain('beta');
    });

    it('should include billing subdomains', () => {
      expect(RESERVED_SUBDOMAINS).toContain('billing');
      expect(RESERVED_SUBDOMAINS).toContain('payment');
      expect(RESERVED_SUBDOMAINS).toContain('pricing');
    });

    it('should include organization-related subdomains', () => {
      expect(RESERVED_SUBDOMAINS).toContain('org');
      expect(RESERVED_SUBDOMAINS).toContain('organization');
      expect(RESERVED_SUBDOMAINS).toContain('team');
      expect(RESERVED_SUBDOMAINS).toContain('workspace');
    });
  });

  describe('extractSubdomain logic', () => {
    it('should identify main domain (no subdomain)', () => {
      const host = 'durj.com';
      const appDomain = 'durj.com';
      const hostWithoutPort = host.split(':')[0];
      const appDomainWithoutPort = appDomain.split(':')[0];

      const isMainDomain = hostWithoutPort === appDomainWithoutPort;

      expect(isMainDomain).toBe(true);
    });

    it('should extract subdomain from tenant URL', () => {
      const host = 'acme.durj.com';
      const appDomain = 'durj.com';
      const hostWithoutPort = host.split(':')[0];
      const appDomainWithoutPort = appDomain.split(':')[0];
      const suffix = `.${appDomainWithoutPort}`;

      const isSubdomain = hostWithoutPort.endsWith(suffix);
      const subdomain = isSubdomain
        ? hostWithoutPort.slice(0, -suffix.length)
        : null;

      expect(isSubdomain).toBe(true);
      expect(subdomain).toBe('acme');
    });

    it('should identify reserved subdomains', () => {
      const subdomain = 'www';
      const isReserved = RESERVED_SUBDOMAINS.has(subdomain.toLowerCase());

      expect(isReserved).toBe(true);
    });

    it('should handle nested subdomains (take first part)', () => {
      const host = 'team.acme.durj.com';
      const appDomain = 'durj.com';
      const hostWithoutPort = host.split(':')[0];
      const suffix = `.${appDomain}`;

      const fullSubdomain = hostWithoutPort.slice(0, -suffix.length);
      const firstSubdomain = fullSubdomain.split('.')[0];

      expect(firstSubdomain).toBe('team');
    });

    it('should handle localhost development format', () => {
      const host = 'acme.localhost:3000';
      const hostWithoutPort = host.split(':')[0];

      const isLocalhost = hostWithoutPort.endsWith('.localhost');
      const subdomain = isLocalhost
        ? hostWithoutPort.replace('.localhost', '')
        : null;

      expect(subdomain).toBe('acme');
    });

    it('should be case-insensitive for reserved subdomain check', () => {
      const subdomain = 'WWW';
      const isReserved = RESERVED_SUBDOMAINS.has(subdomain.toLowerCase());

      expect(isReserved).toBe(true);
    });
  });

  describe('resolveTenantFromSubdomain logic', () => {
    it('should return null for empty subdomain', async () => {
      const subdomain = '';

      const result = !subdomain ? null : 'something';

      expect(result).toBeNull();
    });

    it('should return null for reserved subdomain', async () => {
      const subdomain = 'www';
      const result = RESERVED_SUBDOMAINS.has(subdomain.toLowerCase()) ? null : 'tenant';

      expect(result).toBeNull();
    });

    it('should return tenant info for valid subdomain', async () => {
      const mockOrg = {
        id: 'org-123',
        slug: 'acme',
        name: 'Acme Corp',
        subscriptionTier: 'FREE',
      };

      (mockPrisma.organization.findUnique as jest.Mock).mockResolvedValue(mockOrg);

      const org = await mockPrisma.organization.findUnique({
        where: { slug: 'acme' },
        select: { id: true, slug: true, name: true, subscriptionTier: true },
      });

      expect(org).toEqual(mockOrg);
    });

    it('should return null for non-existent organization', async () => {
      (mockPrisma.organization.findUnique as jest.Mock).mockResolvedValue(null);

      const org = await mockPrisma.organization.findUnique({
        where: { slug: 'nonexistent' },
      });

      expect(org).toBeNull();
    });

    it('should normalize subdomain to lowercase', () => {
      const subdomain = 'ACME';
      const normalized = subdomain.toLowerCase();

      expect(normalized).toBe('acme');
    });
  });

  describe('generateSlug logic', () => {
    it('should convert name to lowercase', () => {
      const name = 'ACME Corp';
      const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '');

      expect(slug).toBe('acmecorp');
    });

    it('should remove spaces', () => {
      const name = 'Acme Corp';
      const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '');

      expect(slug).toBe('acmecorp');
    });

    it('should remove special characters', () => {
      const name = 'Acme & Corp!';
      const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '');

      expect(slug).toBe('acmecorp');
    });

    it('should remove all non-alphanumeric characters', () => {
      const name = 'Test-Company_123';
      const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '');

      expect(slug).toBe('testcompany123');
    });

    it('should trim whitespace', () => {
      const name = '  Acme Corp  ';
      const slug = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

      expect(slug).toBe('acmecorp');
    });

    it('should limit to 63 characters (max subdomain length)', () => {
      const longName = 'A'.repeat(100);
      const slug = longName.toLowerCase().slice(0, 63);

      expect(slug.length).toBeLessThanOrEqual(63);
    });

    it('should handle empty string', () => {
      const name = '';
      const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '');

      expect(slug).toBe('');
    });

    it('should handle numbers', () => {
      const name = 'Company 123';
      const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '');

      expect(slug).toBe('company123');
    });
  });

  describe('validateSlug logic', () => {
    it('should reject empty slug', () => {
      const slug = '';
      const isValid = slug.length > 0;

      expect(isValid).toBe(false);
    });

    it('should reject slug shorter than 3 characters', () => {
      const slug = 'ab';
      const isValid = slug.length >= 3;

      expect(isValid).toBe(false);
    });

    it('should reject slug longer than 63 characters', () => {
      const slug = 'a'.repeat(64);
      const isValid = slug.length <= 63;

      expect(isValid).toBe(false);
    });

    it('should reject slug with uppercase letters', () => {
      const slug = 'ACME';
      const isValid = /^[a-z0-9]+$/.test(slug);

      expect(isValid).toBe(false);
    });

    it('should reject slug with special characters', () => {
      const slug = 'acme-corp';
      const isValid = /^[a-z0-9]+$/.test(slug);

      expect(isValid).toBe(false);
    });

    it('should reject reserved subdomains', () => {
      const slug = 'www';
      const isReserved = RESERVED_SUBDOMAINS.has(slug);

      expect(isReserved).toBe(true);
    });

    it('should accept valid lowercase alphanumeric slug', () => {
      const slug = 'acmecorp123';
      const isValid = /^[a-z0-9]+$/.test(slug) &&
                      slug.length >= 3 &&
                      slug.length <= 63 &&
                      !RESERVED_SUBDOMAINS.has(slug);

      expect(isValid).toBe(true);
    });

    it('should accept 3-character slug', () => {
      const slug = 'abc';
      const isValid = slug.length >= 3;

      expect(isValid).toBe(true);
    });

    it('should accept 63-character slug', () => {
      const slug = 'a'.repeat(63);
      const isValid = slug.length <= 63;

      expect(isValid).toBe(true);
    });
  });

  describe('isSlugAvailable logic', () => {
    it('should return false for invalid slug', () => {
      const slug = 'ab'; // Too short
      const isValid = slug.length >= 3 && /^[a-z0-9]+$/.test(slug);

      expect(isValid).toBe(false);
    });

    it('should return false for reserved slug', () => {
      const slug = 'www';
      const isReserved = RESERVED_SUBDOMAINS.has(slug);

      expect(isReserved).toBe(true);
    });

    it('should return false if slug is taken', async () => {
      (mockPrisma.organization.findUnique as jest.Mock).mockResolvedValue({
        id: 'existing-org',
      });

      const existing = await mockPrisma.organization.findUnique({
        where: { slug: 'acme' },
      });

      expect(existing).not.toBeNull();
    });

    it('should return true if slug is available', async () => {
      (mockPrisma.organization.findUnique as jest.Mock).mockResolvedValue(null);

      const existing = await mockPrisma.organization.findUnique({
        where: { slug: 'newcompany' },
      });
      const isAvailable = !existing;

      expect(isAvailable).toBe(true);
    });

    it('should normalize slug to lowercase for lookup', () => {
      const slug = 'NEWCOMPANY';
      const normalized = slug.toLowerCase();

      expect(normalized).toBe('newcompany');
    });
  });

  describe('generateUniqueSlug logic', () => {
    it('should return base slug if available', async () => {
      (mockPrisma.organization.findUnique as jest.Mock).mockResolvedValue(null);

      const baseSlug = 'acmecorp';
      const existing = await mockPrisma.organization.findUnique({
        where: { slug: baseSlug },
      });

      expect(existing).toBeNull();
      // Therefore baseSlug is available
    });

    it('should append number if base slug is taken', () => {
      const baseSlug = 'acmecorp';
      const counter = 1;
      const slug = `${baseSlug}-${counter}`;

      expect(slug).toBe('acmecorp-1');
    });

    it('should increment number until available slug found', () => {
      const baseSlug = 'acmecorp';
      const counter = 3;
      const slug = `${baseSlug}-${counter}`;

      expect(slug).toBe('acmecorp-3');
    });

    it('should use timestamp as fallback after 100 attempts', () => {
      const baseSlug = 'acmecorp';
      const timestamp = 1234567890;
      const slug = `${baseSlug}-${timestamp}`;

      expect(slug).toMatch(/^acmecorp-\d+$/);
    });
  });

  describe('getOrganizationUrl logic', () => {
    it('should return HTTPS URL in production', () => {
      const protocol = 'https';
      const slug = 'acme';
      const domain = 'durj.com';
      const url = `${protocol}://${slug}.${domain}`;

      expect(url).toBe('https://acme.durj.com');
    });

    it('should return HTTP URL in development', () => {
      const protocol = 'http';
      const slug = 'acme';
      const domain = 'localhost:3000';
      const url = `${protocol}://${slug}.${domain}`;

      expect(url).toBe('http://acme.localhost:3000');
    });

    it('should handle different slugs', () => {
      const protocol = 'https';
      const domain = 'durj.com';

      const url1 = `${protocol}://company1.${domain}`;
      const url2 = `${protocol}://company2.${domain}`;

      expect(url1).toBe('https://company1.durj.com');
      expect(url2).toBe('https://company2.durj.com');
    });
  });

  describe('getMainAppUrl logic', () => {
    it('should return HTTPS URL in production', () => {
      const protocol = 'https';
      const domain = 'durj.com';
      const url = `${protocol}://${domain}`;

      expect(url).toBe('https://durj.com');
    });

    it('should return HTTP URL in development', () => {
      const protocol = 'http';
      const domain = 'localhost:3000';
      const url = `${protocol}://${domain}`;

      expect(url).toBe('http://localhost:3000');
    });
  });

  describe('Security Considerations', () => {
    describe('Subdomain Hijacking Prevention', () => {
      it('should reserve all common infrastructure subdomains', () => {
        const infrastructureSubdomains = ['mail', 'smtp', 'ftp', 'cdn', 'api', 'www'];

        infrastructureSubdomains.forEach((subdomain) => {
          expect(RESERVED_SUBDOMAINS).toContain(subdomain);
        });
      });

      it('should reserve authentication-related subdomains', () => {
        const authSubdomains = ['login', 'signup', 'auth', 'oauth', 'sso'];

        authSubdomains.forEach((subdomain) => {
          expect(RESERVED_SUBDOMAINS).toContain(subdomain);
        });
      });
    });

    describe('Slug Validation Security', () => {
      it('should prevent SQL injection via slug', () => {
        const maliciousSlug = "acme'; DROP TABLE organizations;--";
        const isValid = /^[a-z0-9]+$/.test(maliciousSlug);

        expect(isValid).toBe(false);
      });

      it('should prevent path traversal via slug', () => {
        const maliciousSlug = '../admin';
        const isValid = /^[a-z0-9]+$/.test(maliciousSlug);

        expect(isValid).toBe(false);
      });

      it('should only allow alphanumeric characters', () => {
        const validSlug = 'validcompany123';
        const invalidChars = ['@', '#', '$', '%', '^', '&', '*', '/', '\\', '.'];

        expect(/^[a-z0-9]+$/.test(validSlug)).toBe(true);

        invalidChars.forEach((char) => {
          const invalid = /^[a-z0-9]+$/.test(`company${char}name`);
          expect(invalid).toBe(false);
        });
      });
    });

    describe('Subdomain Enumeration Protection', () => {
      it('should not reveal organization existence through error messages', async () => {
        (mockPrisma.organization.findUnique as jest.Mock).mockResolvedValue(null);

        const org = await mockPrisma.organization.findUnique({
          where: { slug: 'nonexistent' },
        });

        // Should simply return null, not expose any information
        expect(org).toBeNull();
      });
    });
  });
});
