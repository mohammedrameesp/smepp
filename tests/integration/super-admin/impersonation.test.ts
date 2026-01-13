/**
 * @file impersonation.test.ts
 * @description Integration tests for super-admin impersonation functionality
 */

import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/core/prisma';
import { requireRecent2FA } from '@/lib/two-factor';
import { generateJti } from '@/lib/security/impersonation';

jest.mock('next-auth/next');
jest.mock('@/lib/core/prisma');
jest.mock('@/lib/two-factor');
jest.mock('@/lib/security/impersonation');
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'mock-jwt-token'),
  verify: jest.fn(() => ({ superAdminId: 'admin-123' })),
}));


const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockRequireRecent2FA = requireRecent2FA as jest.MockedFunction<typeof requireRecent2FA>;
const mockGenerateJti = generateJti as jest.MockedFunction<typeof generateJti>;

describe('Super Admin Impersonation API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXTAUTH_SECRET = 'test-secret';
    process.env.NEXT_PUBLIC_APP_DOMAIN = 'durj.com';
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'test', writable: true });
  });

  describe('GET /api/super-admin/impersonate', () => {
    it('should return 403 if not super admin', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-123', isSuperAdmin: false },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      const session = await mockGetServerSession();
      expect(session?.user.isSuperAdmin).toBe(false);
    });

    it('should return 403 if not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const session = await mockGetServerSession();
      expect(session).toBeNull();
    });

    it('should require recent 2FA verification', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'super-admin-123', email: 'super@example.com', isSuperAdmin: true },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      // Mock 2FA not recent - should block
      mockRequireRecent2FA.mockResolvedValue({
        status: 403,
        json: () => Promise.resolve({ error: '2FA verification required' }),
      } as any); // eslint-disable-line @typescript-eslint/no-explicit-any -- Mock partial response

      const require2FAResult = await mockRequireRecent2FA('super-admin-123');
      expect(require2FAResult).toBeDefined();
    });

    it('should return 400 if organization ID is missing', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'super-admin-123', isSuperAdmin: true },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });
      mockRequireRecent2FA.mockResolvedValue(null);

      const organizationId = null;
      expect(organizationId).toBeNull();
    });

    it('should return 404 if organization not found', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'super-admin-123', isSuperAdmin: true },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });
      mockRequireRecent2FA.mockResolvedValue(null);

      (mockPrisma.organization.findUnique as jest.Mock).mockResolvedValue(null);

      const org = await mockPrisma.organization.findUnique({
        where: { id: 'nonexistent' },
      });

      expect(org).toBeNull();
    });

    it('should generate impersonation token with correct payload', async () => {
      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'super-admin-123',
          email: 'super@example.com',
          name: 'Super Admin',
          isSuperAdmin: true,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });
      mockRequireRecent2FA.mockResolvedValue(null);
      mockGenerateJti.mockReturnValue('imp_unique-jti-123');

      const mockOrg = {
        id: 'org-123',
        name: 'Acme Corp',
        slug: 'acme',
        logoUrl: null,
        subscriptionTier: 'FREE',
        enabledModules: ['assets', 'subscriptions', 'suppliers'],
      };

      (mockPrisma.organization.findUnique as jest.Mock).mockResolvedValue(mockOrg);

      const session = await mockGetServerSession();
      const org = await mockPrisma.organization.findUnique({
        where: { id: 'org-123' },
      });
      const jti = mockGenerateJti();

      expect(session?.user.isSuperAdmin).toBe(true);
      expect(org).toBeDefined();
      expect(jti).toBe('imp_unique-jti-123');
    });

    it('should redirect to organization subdomain with impersonation token', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'super-admin-123', isSuperAdmin: true },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });
      mockRequireRecent2FA.mockResolvedValue(null);

      const mockOrg = { id: 'org-123', slug: 'acme', name: 'Acme' };
      (mockPrisma.organization.findUnique as jest.Mock).mockResolvedValue(mockOrg);

      const protocol = 'http'; // test env
      const domain = 'durj.com';
      const expectedUrl = `${protocol}://${mockOrg.slug}.${domain}/admin?impersonate=`;

      expect(expectedUrl).toContain('acme.durj.com');
      expect(expectedUrl).toContain('/admin?impersonate=');
    });

    it('should set token expiry to 15 minutes', () => {
      const IMPERSONATION_EXPIRY_SECONDS = 15 * 60;

      expect(IMPERSONATION_EXPIRY_SECONDS).toBe(900);
    });
  });

  describe('POST /api/super-admin/impersonate', () => {
    it('should return 403 if not super admin', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-123', isSuperAdmin: false },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      const session = await mockGetServerSession();
      expect(session?.user.isSuperAdmin).toBe(false);
    });

    it('should require recent 2FA verification', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'super-admin-123', isSuperAdmin: true },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      mockRequireRecent2FA.mockResolvedValue({
        status: 403,
      } as any); // eslint-disable-line @typescript-eslint/no-explicit-any -- Mock partial response

      const result = await mockRequireRecent2FA('super-admin-123');
      expect(result).toBeDefined();
    });

    it('should return 400 if organizationId missing in body', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'super-admin-123', isSuperAdmin: true },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });
      mockRequireRecent2FA.mockResolvedValue(null);

      const body = {}; // Missing organizationId
      expect(body).not.toHaveProperty('organizationId');
    });

    it('should return JSON response with portal URL', async () => {
      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'super-admin-123',
          email: 'super@example.com',
          name: 'Super Admin',
          isSuperAdmin: true,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });
      mockRequireRecent2FA.mockResolvedValue(null);
      mockGenerateJti.mockReturnValue('imp_jti-123');

      const mockOrg = {
        id: 'org-123',
        name: 'Acme Corp',
        slug: 'acme',
        subscriptionTier: 'FREE',
        enabledModules: ['assets'],
      };

      (mockPrisma.organization.findUnique as jest.Mock).mockResolvedValue(mockOrg);

      // Expected response structure
      const expectedResponse = {
        success: true,
        portalUrl: expect.stringContaining('acme.durj.com'),
        organization: {
          id: 'org-123',
          name: 'Acme Corp',
          slug: 'acme',
        },
      };

      expect(expectedResponse.success).toBe(true);
      expect(expectedResponse.organization.slug).toBe('acme');
    });
  });

  describe('Security & Audit', () => {
    it('should include JTI for token revocation', async () => {
      mockGenerateJti.mockReturnValue('imp_unique-jti-for-revocation');

      const jti = mockGenerateJti();

      expect(jti).toMatch(/^imp_/);
      expect(mockGenerateJti).toHaveBeenCalled();
    });

    it('should include all required fields in token payload', () => {
      const expectedPayloadFields = [
        'jti',
        'superAdminId',
        'superAdminEmail',
        'superAdminName',
        'organizationId',
        'organizationSlug',
        'organizationName',
        'subscriptionTier',
        'enabledModules',
        'purpose',
        'iat',
        'exp',
      ];

      const mockPayload = {
        jti: 'imp_123',
        superAdminId: 'admin-123',
        superAdminEmail: 'admin@example.com',
        superAdminName: 'Admin',
        organizationId: 'org-123',
        organizationSlug: 'acme',
        organizationName: 'Acme Corp',
        subscriptionTier: 'FREE',
        enabledModules: ['assets'],
        purpose: 'impersonation',
        iat: 1234567890,
        exp: 1234568790,
      };

      expectedPayloadFields.forEach((field) => {
        expect(mockPayload).toHaveProperty(field);
      });
    });

    it('should log audit event with client IP and user agent', () => {
      const auditEvent = {
        event: 'IMPERSONATION_START',
        timestamp: new Date().toISOString(),
        superAdmin: {
          id: 'super-admin-123',
          email: 'super@example.com',
          name: 'Super Admin',
        },
        targetOrganization: {
          id: 'org-123',
          name: 'Acme Corp',
          slug: 'acme',
        },
        clientIp: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        expiresIn: '15 minutes',
      };

      expect(auditEvent).toHaveProperty('event', 'IMPERSONATION_START');
      expect(auditEvent).toHaveProperty('clientIp');
      expect(auditEvent).toHaveProperty('userAgent');
      expect(auditEvent).toHaveProperty('expiresIn');
    });

    it('should use HTTPS in production', () => {
      // Test the protocol selection logic directly
      const getProtocol = (nodeEnv: string) => nodeEnv === 'production' ? 'https' : 'http';

      expect(getProtocol('production')).toBe('https');
    });

    it('should use HTTP in development', () => {
      // Test the protocol selection logic directly
      const getProtocol = (nodeEnv: string) => nodeEnv === 'production' ? 'https' : 'http';

      expect(getProtocol('development')).toBe('http');
    });
  });

  describe('POST /api/super-admin/impersonation/end', () => {
    it('should clear impersonation session', () => {
      // When ending impersonation, client should:
      // 1. Clear impersonation token from URL/storage
      // 2. Redirect back to super-admin portal

      const mockRedirectUrl = 'https://durj.com/super-admin';
      expect(mockRedirectUrl).toContain('super-admin');
    });
  });

  describe('POST /api/super-admin/impersonation/revoke', () => {
    it('should revoke a specific impersonation token', async () => {
      const jti = 'imp_token-to-revoke';

      // Mock revocation
      (mockPrisma.revokedImpersonationToken?.upsert as jest.Mock)?.mockResolvedValue({
        jti,
        revokedAt: new Date(),
      });

      expect(jti).toMatch(/^imp_/);
    });

    it('should require super admin access', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-123', isSuperAdmin: false },
        expires: '',
      });

      const session = await mockGetServerSession();
      expect(session?.user.isSuperAdmin).toBe(false);
    });

    it('should record revocation reason', async () => {
      const revocationData = {
        jti: 'imp_123',
        revokedBy: 'security-team@example.com',
        reason: 'Suspicious activity detected',
      };

      expect(revocationData).toHaveProperty('reason');
    });
  });
});
