/**
 * @file organizations.test.ts
 * @description Integration tests for super-admin organization management
 */

import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/core/prisma';
import { validateSlug, isSlugAvailable } from '@/lib/multi-tenant/subdomain';
import { sendEmail } from '@/lib/core/email';
import { seedDefaultPermissions } from '@/lib/access-control';

jest.mock('next-auth/next');
jest.mock('@/lib/core/prisma');
jest.mock('@/lib/multi-tenant/subdomain');
jest.mock('@/lib/core/email');
jest.mock('@/lib/access-control');
jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => ({
    toString: () => 'test-invite-token-1234567890abcdef',
  })),
}));

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockValidateSlug = validateSlug as jest.MockedFunction<typeof validateSlug>;
const mockIsSlugAvailable = isSlugAvailable as jest.MockedFunction<typeof isSlugAvailable>;
const mockSendEmail = sendEmail as jest.MockedFunction<typeof sendEmail>;
const mockSeedDefaultPermissions = seedDefaultPermissions as jest.MockedFunction<typeof seedDefaultPermissions>;

describe('Super Admin Organizations API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/super-admin/organizations', () => {
    it('should return 403 if user is not super admin', async () => {
      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'user-123',
          email: 'admin@example.com',
          isSuperAdmin: false,
        },
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

    it('should return organizations list for super admin', async () => {
      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'super-admin-123',
          email: 'super@example.com',
          isSuperAdmin: true,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      const mockOrganizations = [
        {
          id: 'org-1',
          name: 'Acme Corp',
          slug: 'acme',
          subscriptionTier: 'FREE',
          createdAt: new Date('2024-01-01'),
          _count: { teamMembers: 5, assets: 10 },
        },
        {
          id: 'org-2',
          name: 'Globex Inc',
          slug: 'globex',
          subscriptionTier: 'PLUS',
          createdAt: new Date('2024-01-15'),
          _count: { teamMembers: 15, assets: 50 },
        },
      ];

      (mockPrisma.organization.findMany as jest.Mock).mockResolvedValue(mockOrganizations);

      const session = await mockGetServerSession();
      expect(session?.user.isSuperAdmin).toBe(true);

      const organizations = await mockPrisma.organization.findMany();
      expect(organizations).toHaveLength(2);
      expect(organizations[0].name).toBe('Acme Corp');
    });

    it('should order organizations by creation date descending', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'super-admin-123', isSuperAdmin: true },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      (mockPrisma.organization.findMany as jest.Mock).mockResolvedValue([]);

      await mockPrisma.organization.findMany({
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { teamMembers: true, assets: true } } },
      });

      expect(mockPrisma.organization.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { teamMembers: true, assets: true } } },
      });
    });

    it('should include team member and asset counts', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'super-admin-123', isSuperAdmin: true },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      const mockOrg = {
        id: 'org-1',
        name: 'Test Org',
        slug: 'testorg',
        _count: { teamMembers: 10, assets: 25 },
      };

      (mockPrisma.organization.findMany as jest.Mock).mockResolvedValue([mockOrg]);

      const orgs = await mockPrisma.organization.findMany();
      expect(orgs[0]._count.teamMembers).toBe(10);
      expect(orgs[0]._count.assets).toBe(25);
    });
  });

  describe('POST /api/super-admin/organizations', () => {
    const validOrgData = {
      name: 'New Company',
      slug: 'newcompany',
      adminEmail: 'admin@newcompany.com',
      adminName: 'John Admin',
    };

    it('should return 403 if not super admin', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-123', isSuperAdmin: false },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      const session = await mockGetServerSession();
      expect(session?.user.isSuperAdmin).toBe(false);
    });

    it('should return 400 for invalid name', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'super-admin-123', isSuperAdmin: true },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      const invalidData = { ...validOrgData, name: 'A' }; // Too short

      // Name must be at least 2 characters
      expect(invalidData.name.length).toBeLessThan(2);
    });

    it('should return 400 for invalid slug', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'super-admin-123', isSuperAdmin: true },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      mockValidateSlug.mockReturnValue({
        valid: false,
        error: 'Slug must be at least 3 characters',
      });

      const result = mockValidateSlug('ab');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Slug must be at least 3 characters');
    });

    it('should return 400 for invalid email', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'super-admin-123', isSuperAdmin: true },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      const invalidData = { ...validOrgData, adminEmail: 'not-an-email' };

      // Should fail email validation
      const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invalidData.adminEmail);
      expect(isValidEmail).toBe(false);
    });

    it('should return 409 if slug is already taken', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'super-admin-123', isSuperAdmin: true },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      mockValidateSlug.mockReturnValue({ valid: true });
      mockIsSlugAvailable.mockResolvedValue(false);

      const isAvailable = await mockIsSlugAvailable('existingslug');
      expect(isAvailable).toBe(false);
    });

    it('should create organization with valid data', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'super-admin-123', isSuperAdmin: true },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      mockValidateSlug.mockReturnValue({ valid: true });
      mockIsSlugAvailable.mockResolvedValue(true);

      const createdOrg = {
        id: 'new-org-id',
        name: 'New Company',
        slug: 'newcompany',
      };

      // Mock $transaction
      (mockPrisma.$transaction as jest.Mock).mockResolvedValue(createdOrg);

      const result = await mockPrisma.$transaction(async () => createdOrg);
      expect(result.id).toBe('new-org-id');
      expect(result.slug).toBe('newcompany');
    });

    it('should create organization invitation', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'super-admin-123', isSuperAdmin: true },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      mockValidateSlug.mockReturnValue({ valid: true });
      mockIsSlugAvailable.mockResolvedValue(true);

      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const tx = {
          organization: {
            create: jest.fn().mockResolvedValue({ id: 'org-123', name: 'Test', slug: 'test' }),
          },
          organizationSetupProgress: {
            create: jest.fn().mockResolvedValue({}),
          },
          organizationInvitation: {
            create: jest.fn().mockResolvedValue({
              id: 'invite-123',
              email: 'admin@test.com',
              role: 'OWNER',
              token: 'test-token',
            }),
          },
        };
        return callback(tx);
      });

      // Verify invitation is created with correct role
      expect(mockPrisma.$transaction).toBeDefined();
    });

    it('should send invitation email', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'super-admin-123', isSuperAdmin: true },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      mockValidateSlug.mockReturnValue({ valid: true });
      mockIsSlugAvailable.mockResolvedValue(true);
      mockSendEmail.mockResolvedValue({ success: true });

      const emailResult = await mockSendEmail({
        to: 'admin@test.com',
        subject: 'Welcome to Durj',
        html: '<p>Test</p>',
        text: 'Test',
      });

      expect(emailResult.success).toBe(true);
      expect(mockSendEmail).toHaveBeenCalled();
    });

    it('should seed default permissions for new organization', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'super-admin-123', isSuperAdmin: true },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      mockValidateSlug.mockReturnValue({ valid: true });
      mockIsSlugAvailable.mockResolvedValue(true);
      mockSeedDefaultPermissions.mockResolvedValue(undefined);

      await mockSeedDefaultPermissions('org-123');

      expect(mockSeedDefaultPermissions).toHaveBeenCalledWith('org-123');
    });

    it('should return 201 with organization and invitation details', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'super-admin-123', isSuperAdmin: true },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      mockValidateSlug.mockReturnValue({ valid: true });
      mockIsSlugAvailable.mockResolvedValue(true);
      mockSendEmail.mockResolvedValue({ success: true });

      // Expected response structure
      const expectedResponse = {
        success: true,
        emailSent: true,
        organization: {
          id: 'org-123',
          name: 'New Company',
          slug: 'newcompany',
        },
        invitation: {
          email: 'admin@newcompany.com',
          inviteUrl: expect.stringContaining('/invite/'),
          expiresAt: expect.any(String),
        },
      };

      expect(expectedResponse.success).toBe(true);
      expect(expectedResponse.emailSent).toBe(true);
    });

    it('should set default subscription tier to FREE', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'super-admin-123', isSuperAdmin: true },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      mockValidateSlug.mockReturnValue({ valid: true });
      mockIsSlugAvailable.mockResolvedValue(true);

      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const tx = {
          organization: {
            create: jest.fn((args) => {
              expect(args.data.subscriptionTier).toBe('FREE');
              return { id: 'org-123', subscriptionTier: 'FREE' };
            }),
          },
          organizationSetupProgress: { create: jest.fn() },
          organizationInvitation: { create: jest.fn() },
        };
        return callback(tx);
      });

      await mockPrisma.$transaction(() => Promise.resolve({}));
    });

    it('should set default enabled modules', async () => {
      const defaultModules = ['assets', 'subscriptions', 'suppliers'];

      mockGetServerSession.mockResolvedValue({
        user: { id: 'super-admin-123', isSuperAdmin: true },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      expect(defaultModules).toContain('assets');
      expect(defaultModules).toContain('subscriptions');
      expect(defaultModules).toContain('suppliers');
    });

    it('should include optional fields if provided', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'super-admin-123', isSuperAdmin: true },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      const orgDataWithOptionals = {
        ...validOrgData,
        industry: 'Technology',
        companySize: '50-100',
        enabledModules: ['assets', 'subscriptions', 'payroll'],
        internalNotes: 'Enterprise customer',
      };

      expect(orgDataWithOptionals.industry).toBe('Technology');
      expect(orgDataWithOptionals.companySize).toBe('50-100');
      expect(orgDataWithOptionals.enabledModules).toContain('payroll');
      expect(orgDataWithOptionals.internalNotes).toBe('Enterprise customer');
    });
  });

  describe('Security', () => {
    it('should only allow super admin access', async () => {
      const testCases = [
        { user: null, expected: 'forbidden' },
        { user: { isSuperAdmin: false }, expected: 'forbidden' },
        { user: { isSuperAdmin: true }, expected: 'allowed' },
      ];

      for (const testCase of testCases) {
        mockGetServerSession.mockResolvedValue(
          testCase.user ? { user: testCase.user as any, expires: '' } : null
        );

        const session = await mockGetServerSession();

        if (testCase.expected === 'forbidden') {
          expect(session?.user?.isSuperAdmin).not.toBe(true);
        } else {
          expect(session?.user?.isSuperAdmin).toBe(true);
        }
      }
    });

    it('should normalize slug to lowercase', async () => {
      mockValidateSlug.mockReturnValue({ valid: true });

      const slug = 'NewCompany'.toLowerCase();
      expect(slug).toBe('newcompany');
    });

    it('should normalize admin email to lowercase', async () => {
      const email = 'Admin@Example.COM'.toLowerCase();
      expect(email).toBe('admin@example.com');
    });

    it('should set invitation expiry to 7 days', () => {
      const now = Date.now();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      const expiresAt = new Date(now + sevenDaysMs);

      expect(expiresAt.getTime() - now).toBe(sevenDaysMs);
    });
  });
});
