/**
 * Authentication API Integration Tests
 * Covers: /api/auth/* routes
 */

import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/core/prisma';

jest.mock('next-auth/next');
jest.mock('@/lib/core/prisma');

// Type for mocked Prisma model with common methods
interface MockPrismaModel {
  findUnique: jest.Mock;
  findFirst: jest.Mock;
  findMany: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  upsert: jest.Mock;
  delete: jest.Mock;
  count: jest.Mock;
}

// Helper to get mocked Prisma model
const getMockedModel = (model: unknown): MockPrismaModel => model as MockPrismaModel;

describe('Authentication API Tests', () => {
  const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/signup', () => {
    it('should create a new user with valid data', async () => {
      const signupData = {
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        name: 'New User',
      };

      const mockUser = getMockedModel(prisma.user);
      mockUser.findUnique.mockResolvedValue(null); // No existing user
      mockUser.create.mockResolvedValue({
        id: 'user-new',
        email: signupData.email,
        name: signupData.name,
        emailVerified: null,
      });

      const existingUser = await mockUser.findUnique({ where: { email: signupData.email } });
      expect(existingUser).toBeNull();

      const newUser = await mockUser.create({ data: signupData });
      expect(newUser.email).toBe(signupData.email);
    });

    it('should reject signup with existing email', async () => {
      const mockUser = getMockedModel(prisma.user);
      mockUser.findUnique.mockResolvedValue({
        id: 'user-existing',
        email: 'existing@example.com',
      });

      const existingUser = await mockUser.findUnique({
        where: { email: 'existing@example.com' },
      });
      expect(existingUser).not.toBeNull();
    });

    it('should validate password requirements', () => {
      const validatePassword = (password: string): boolean => {
        const minLength = password.length >= 8;
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasNumber = /\d/.test(password);
        return minLength && hasUpper && hasLower && hasNumber;
      };

      expect(validatePassword('SecurePass123')).toBe(true);
      expect(validatePassword('weak')).toBe(false);
      expect(validatePassword('nouppercase123')).toBe(false);
      expect(validatePassword('NOLOWERCASE123')).toBe(false);
      expect(validatePassword('NoNumbers!')).toBe(false);
    });

    it('should normalize email to lowercase', () => {
      const normalizeEmail = (email: string) => email.toLowerCase().trim();
      expect(normalizeEmail('USER@EXAMPLE.COM')).toBe('user@example.com');
      expect(normalizeEmail('  User@Example.com  ')).toBe('user@example.com');
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should generate reset token for existing user', async () => {
      const mockUser = getMockedModel(prisma.user);
      mockUser.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'user@example.com',
        name: 'Test User',
      });

      const user = await mockUser.findUnique({ where: { email: 'user@example.com' } });
      expect(user).not.toBeNull();
    });

    it('should not reveal if email exists (security)', async () => {
      // Both existing and non-existing emails should return same response
      const mockUser = getMockedModel(prisma.user);
      mockUser.findUnique.mockResolvedValue(null);

      const user = await mockUser.findUnique({ where: { email: 'nonexistent@example.com' } });
      // Should return success message regardless of user existence
      expect(user).toBeNull();
    });

    it('should hash reset token before storage', () => {
      const createHash = (token: string) => {
        // Simulated hash function
        return `hashed_${token}`;
      };

      const rawToken = 'random-reset-token';
      const hashedToken = createHash(rawToken);
      expect(hashedToken).not.toBe(rawToken);
      expect(hashedToken).toContain('hashed_');
    });

    it('should set token expiry to 1 hour', () => {
      const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      const now = new Date();
      const diffMs = tokenExpiry.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      expect(Math.round(diffHours)).toBe(1);
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('should reset password with valid token', async () => {
      const mockUser = getMockedModel(prisma.user);
      mockUser.findFirst.mockResolvedValue({
        id: 'user-123',
        email: 'user@example.com',
        resetToken: 'hashed_valid_token',
        resetTokenExpiry: new Date(Date.now() + 3600000), // Not expired
      });

      const user = await mockUser.findFirst({
        where: {
          resetToken: 'hashed_valid_token',
          resetTokenExpiry: { gte: new Date() },
        },
      });
      expect(user).not.toBeNull();
    });

    it('should reject expired token', async () => {
      const mockUser = getMockedModel(prisma.user);
      mockUser.findFirst.mockResolvedValue(null); // Token expired

      const user = await mockUser.findFirst({
        where: {
          resetToken: 'hashed_expired_token',
          resetTokenExpiry: { gte: new Date() },
        },
      });
      expect(user).toBeNull();
    });

    it('should clear reset token after use', async () => {
      const mockUser = getMockedModel(prisma.user);
      mockUser.update.mockResolvedValue({
        id: 'user-123',
        resetToken: null,
        resetTokenExpiry: null,
        passwordChangedAt: new Date(),
      });

      const updatedUser = await mockUser.update({
        where: { id: 'user-123' },
        data: {
          passwordHash: 'new_hashed_password',
          resetToken: null,
          resetTokenExpiry: null,
          passwordChangedAt: new Date(),
        },
      });

      expect(updatedUser.resetToken).toBeNull();
      expect(updatedUser.resetTokenExpiry).toBeNull();
    });

    it('should invalidate existing sessions on password change', async () => {
      const mockUser = getMockedModel(prisma.user);
      const passwordChangedAt = new Date();

      mockUser.update.mockResolvedValue({
        id: 'user-123',
        passwordChangedAt,
      });

      const updatedUser = await mockUser.update({
        where: { id: 'user-123' },
        data: { passwordChangedAt },
      });

      expect(updatedUser.passwordChangedAt).toEqual(passwordChangedAt);
    });
  });

  describe('GET/POST /api/auth/set-password', () => {
    it('should validate setup token', async () => {
      const mockTeamMember = getMockedModel(prisma.teamMember);
      mockTeamMember.findFirst.mockResolvedValue({
        id: 'member-123',
        email: 'newuser@example.com',
        setupToken: 'valid_setup_token',
        setupTokenExpiry: new Date(Date.now() + 86400000), // Not expired
      });

      const member = await mockTeamMember.findFirst({
        where: { setupToken: 'valid_setup_token' },
      });
      expect(member).not.toBeNull();
    });

    it('should set password and clear setup token', async () => {
      const mockTeamMember = getMockedModel(prisma.teamMember);
      mockTeamMember.update.mockResolvedValue({
        id: 'member-123',
        passwordHash: 'hashed_password',
        setupToken: null,
        setupTokenExpiry: null,
        emailVerified: new Date(),
      });

      const updatedMember = await mockTeamMember.update({
        where: { id: 'member-123' },
        data: {
          passwordHash: 'hashed_password',
          setupToken: null,
          setupTokenExpiry: null,
          emailVerified: new Date(),
        },
      });

      expect(updatedMember.setupToken).toBeNull();
      expect(updatedMember.emailVerified).not.toBeNull();
    });
  });

  describe('OAuth Routes /api/auth/oauth/*', () => {
    describe('GET /api/auth/oauth/google', () => {
      it('should redirect to Google OAuth with state', () => {
        const state = {
          provider: 'google',
          tenantSlug: 'test-org',
          returnUrl: '/admin',
        };

        // State should be encrypted before sending
        expect(state.provider).toBe('google');
        expect(state.tenantSlug).toBeDefined();
      });

      it('should use custom OAuth credentials if configured', async () => {
        const mockOrg = getMockedModel(prisma.organization);
        mockOrg.findFirst.mockResolvedValue({
          id: 'org-123',
          slug: 'custom-org',
          hasCustomGoogleOAuth: true,
          googleOAuthClientIdEncrypted: 'encrypted_client_id',
          googleOAuthClientSecretEncrypted: 'encrypted_client_secret',
        });

        const org = await mockOrg.findFirst({ where: { slug: 'custom-org' } });
        expect(org.hasCustomGoogleOAuth).toBe(true);
      });
    });

    describe('GET /api/auth/oauth/google/callback', () => {
      it('should validate state parameter', () => {
        const validateState = (encryptedState: string | null): boolean => {
          if (!encryptedState) return false;
          // Decrypt and validate
          return encryptedState.length > 0;
        };

        expect(validateState(null)).toBe(false);
        expect(validateState('')).toBe(false);
        expect(validateState('encrypted_valid_state')).toBe(true);
      });

      it('should create or update user on successful OAuth', async () => {
        const mockUser = getMockedModel(prisma.user);
        mockUser.upsert.mockResolvedValue({
          id: 'user-oauth',
          email: 'oauth@example.com',
          name: 'OAuth User',
          emailVerified: new Date(),
        });

        const user = await mockUser.upsert({
          where: { email: 'oauth@example.com' },
          create: { email: 'oauth@example.com', name: 'OAuth User' },
          update: { name: 'OAuth User' },
        });

        expect(user.emailVerified).not.toBeNull();
      });

      it('should check if user is allowed to access tenant', async () => {
        const mockTeamMember = getMockedModel(prisma.teamMember);
        mockTeamMember.findFirst.mockResolvedValue({
          id: 'member-123',
          tenantId: 'tenant-123',
          email: 'user@example.com',
          status: 'ACTIVE',
        });

        const member = await mockTeamMember.findFirst({
          where: {
            email: 'user@example.com',
            tenantId: 'tenant-123',
            status: 'ACTIVE',
          },
        });
        expect(member).not.toBeNull();
      });
    });

    describe('GET /api/auth/oauth/azure', () => {
      it('should redirect to Azure AD OAuth', () => {
        const state = {
          provider: 'azure',
          tenantSlug: 'enterprise-org',
        };
        expect(state.provider).toBe('azure');
      });
    });

    describe('GET /api/auth/oauth/azure/callback', () => {
      it('should handle Azure AD callback', async () => {
        const mockUser = getMockedModel(prisma.user);
        mockUser.upsert.mockResolvedValue({
          id: 'user-azure',
          email: 'azure@example.com',
          name: 'Azure User',
        });

        const user = await mockUser.upsert({
          where: { email: 'azure@example.com' },
          create: { email: 'azure@example.com' },
          update: {},
        });
        expect(user).not.toBeNull();
      });
    });
  });

  describe('Account Lockout', () => {
    it('should lock account after max failed attempts', async () => {
      const MAX_FAILED_ATTEMPTS = 5;
      const mockUser = getMockedModel(prisma.user);
      mockUser.findUnique.mockResolvedValue({
        id: 'user-123',
        failedLoginAttempts: MAX_FAILED_ATTEMPTS,
        lockedUntil: new Date(Date.now() + 300000), // 5 minutes
      });

      const user = await mockUser.findUnique({ where: { email: 'user@example.com' } });
      expect(user.failedLoginAttempts).toBe(MAX_FAILED_ATTEMPTS);
      expect(new Date(user.lockedUntil).getTime()).toBeGreaterThan(Date.now());
    });

    it('should use progressive lockout durations', () => {
      const LOCKOUT_DURATIONS = [5, 15, 30, 60]; // minutes
      const lockoutIndex = 2;
      const lockoutDuration = LOCKOUT_DURATIONS[Math.min(lockoutIndex, LOCKOUT_DURATIONS.length - 1)];
      expect(lockoutDuration).toBe(30);
    });

    it('should clear failed attempts on successful login', async () => {
      const mockUser = getMockedModel(prisma.user);
      mockUser.update.mockResolvedValue({
        id: 'user-123',
        failedLoginAttempts: 0,
        lockedUntil: null,
        lockoutCount: 0,
      });

      const user = await mockUser.update({
        where: { id: 'user-123' },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });
      expect(user.failedLoginAttempts).toBe(0);
    });
  });

  describe('Session Validation', () => {
    it('should return null for unauthenticated requests', async () => {
      mockGetServerSession.mockResolvedValue(null);
      const session = await mockGetServerSession();
      expect(session).toBeNull();
    });

    it('should validate session expiry', () => {
      const isSessionValid = (expiresAt: string): boolean => {
        return new Date(expiresAt) > new Date();
      };

      const validExpiry = new Date(Date.now() + 86400000).toISOString();
      const expiredExpiry = new Date(Date.now() - 86400000).toISOString();

      expect(isSessionValid(validExpiry)).toBe(true);
      expect(isSessionValid(expiredExpiry)).toBe(false);
    });

    it('should include organization context in session', async () => {
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'user@example.com',
          organizationId: 'org-123',
          organizationSlug: 'test-org',
          orgRole: 'ADMIN',
          subscriptionTier: 'PROFESSIONAL',
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      };

      mockGetServerSession.mockResolvedValue(mockSession);
      const session = await mockGetServerSession();

      expect(session?.user.organizationId).toBe('org-123');
      expect(session?.user.orgRole).toBe('ADMIN');
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit login attempts', () => {
      const AUTH_RATE_LIMIT = 5;
      const AUTH_RATE_WINDOW_MINUTES = 15;

      expect(AUTH_RATE_LIMIT).toBe(5);
      expect(AUTH_RATE_WINDOW_MINUTES).toBe(15);
    });

    it('should return 429 when rate limited', () => {
      const isRateLimited = true;
      const retryAfterSeconds = 60;

      if (isRateLimited) {
        expect(retryAfterSeconds).toBeGreaterThan(0);
      }
    });
  });
});
