/**
 * @file utils.test.ts
 * @description Unit tests for OAuth utility functions
 * @module tests/unit/lib/oauth
 *
 * Tests cover:
 * - Encryption/decryption of OAuth secrets (AES-256-GCM)
 * - OAuth state management with CSRF protection
 * - State expiration (10 minutes)
 * - User security validation
 * - Session token creation
 * - URL utility functions
 */

// Unmock the OAuth utils module so we can test the real implementation
// (it's mocked globally in jest.setup.ts for integration tests)
jest.unmock('@/lib/oauth/utils');

// Mock environment variables before importing
const originalEnv = process.env;
beforeAll(() => {
  process.env = {
    ...originalEnv,
    OAUTH_ENCRYPTION_KEY: 'test-encryption-key-at-least-32-chars-long',
    NEXTAUTH_SECRET: 'test-nextauth-secret-for-testing',
    NEXTAUTH_URL: 'https://app.example.com',
    NEXT_PUBLIC_APP_DOMAIN: 'example.com',
  };
});

afterAll(() => {
  process.env = originalEnv;
});

// Mock Prisma
jest.mock('@/lib/core/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    teamMember: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    organization: { findUnique: jest.fn() },
  },
}));

// Mock account lockout (User-only functions - TeamMember lockout removed)
jest.mock('@/lib/security/account-lockout', () => ({
  isAccountLocked: jest.fn(),
  clearFailedLogins: jest.fn(),
}));

// Mock next-auth/jwt
jest.mock('next-auth/jwt', () => ({
  encode: jest.fn().mockResolvedValue('mock-jwt-token'),
}));

import {
  encrypt,
  decrypt,
  encryptState,
  decryptState,
  validateOAuthSecurity,
  upsertOAuthUser,
  createSessionToken,
  getBaseUrl,
  getAppDomain,
  getTenantUrl,
} from '@/lib/oauth/utils';
import { prisma } from '@/lib/core/prisma';
import { isAccountLocked, clearFailedLogins } from '@/lib/security/account-lockout';
import { encode } from 'next-auth/jwt';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('OAuth Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // ENCRYPTION / DECRYPTION
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt a string correctly', () => {
      const original = 'my-secret-oauth-key';
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);

      expect(encrypted).not.toBe(original);
      expect(encrypted).toContain(':'); // Format: iv:authTag:ciphertext
      expect(decrypted).toBe(original);
    });

    it('should return empty string for empty input', () => {
      expect(encrypt('')).toBe('');
      expect(decrypt('')).toBe('');
    });

    it('should return empty string for invalid encrypted format', () => {
      expect(decrypt('not-encrypted')).toBe('');
      expect(decrypt('invalid:format')).toBe('');
    });

    it('should produce different ciphertext for same plaintext (random IV)', () => {
      const original = 'test-secret';
      const encrypted1 = encrypt(original);
      const encrypted2 = encrypt(original);

      expect(encrypted1).not.toBe(encrypted2); // Different IVs
      expect(decrypt(encrypted1)).toBe(original);
      expect(decrypt(encrypted2)).toBe(original);
    });

    it('should handle special characters and unicode', () => {
      const special = 'pass@word!#$%^&*()_+{}[]|\\:";\'<>?,./`~';
      const unicode = 'パスワード密码пароль';

      expect(decrypt(encrypt(special))).toBe(special);
      expect(decrypt(encrypt(unicode))).toBe(unicode);
    });

    it('should handle long strings', () => {
      const longString = 'a'.repeat(10000);
      const encrypted = encrypt(longString);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(longString);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // OAUTH STATE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('encryptState/decryptState', () => {
    it('should encrypt and decrypt OAuth state', () => {
      const stateData = {
        subdomain: 'acme',
        orgId: 'org-123',
        provider: 'google' as const,
      };

      const encrypted = encryptState(stateData);
      const decrypted = decryptState(encrypted);

      expect(decrypted).not.toBeNull();
      expect(decrypted!.subdomain).toBe('acme');
      expect(decrypted!.orgId).toBe('org-123');
      expect(decrypted!.provider).toBe('google');
      expect(decrypted!.timestamp).toBeDefined();
      expect(decrypted!.nonce).toBeDefined();
    });

    it('should include invite token when provided', () => {
      const stateData = {
        subdomain: 'acme',
        orgId: 'org-123',
        provider: 'azure' as const,
        inviteToken: 'invite-abc-123',
      };

      const encrypted = encryptState(stateData);
      const decrypted = decryptState(encrypted);

      expect(decrypted!.inviteToken).toBe('invite-abc-123');
    });

    it('should handle null orgId', () => {
      const stateData = {
        subdomain: 'main',
        orgId: null,
        provider: 'google' as const,
      };

      const encrypted = encryptState(stateData);
      const decrypted = decryptState(encrypted);

      expect(decrypted!.orgId).toBeNull();
    });

    it('should return null for expired state (>10 minutes)', () => {
      const stateData = {
        subdomain: 'acme',
        orgId: 'org-123',
        provider: 'google' as const,
      };

      const encrypted = encryptState(stateData);

      // Mock Date.now to simulate 11 minutes later
      const originalNow = Date.now;
      Date.now = jest.fn(() => originalNow() + 11 * 60 * 1000);

      const decrypted = decryptState(encrypted);

      expect(decrypted).toBeNull();

      Date.now = originalNow;
    });

    it('should return null for tampered state', () => {
      const stateData = {
        subdomain: 'acme',
        orgId: 'org-123',
        provider: 'google' as const,
      };

      const encrypted = encryptState(stateData);
      const tampered = encrypted.slice(0, -5) + 'xxxxx'; // Modify end

      const decrypted = decryptState(tampered);

      expect(decrypted).toBeNull();
    });

    it('should return null for empty or invalid input', () => {
      expect(decryptState('')).toBeNull();
      expect(decryptState('invalid')).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // OAUTH SECURITY VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('validateOAuthSecurity', () => {
    // Default mock: no existing TeamMember, and account not locked
    beforeEach(() => {
      (mockPrisma.teamMember.findFirst as jest.Mock).mockResolvedValue(null);
      (isAccountLocked as jest.Mock).mockResolvedValue({ locked: false });
    });

    it('should allow login for new users', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await validateOAuthSecurity('new@example.com', 'org-123', 'google');

      expect(result.allowed).toBe(true);
    });

    it('should block deactivated users', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-123',
        isDeleted: true,
        canLogin: true,
        isSuperAdmin: false,
      });

      const result = await validateOAuthSecurity('deleted@example.com', 'org-123', 'google');

      expect(result.allowed).toBe(false);
      expect(result.error).toBe('AccountDeactivated');
    });

    it('should block team members who cannot login', async () => {
      // canLogin check is on TeamMember, not User
      (mockPrisma.teamMember.findFirst as jest.Mock).mockResolvedValue({
        id: 'member-123',
        isDeleted: false,
        canLogin: false,
        tenant: {
          allowedAuthMethods: [],
        },
      });

      const result = await validateOAuthSecurity('driver@example.com', 'org-123', 'google');

      expect(result.allowed).toBe(false);
      expect(result.error).toBe('LoginDisabled');
    });

    it('should block locked accounts', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-123',
        isDeleted: false,
        canLogin: true,
        isSuperAdmin: false,
      });

      const lockoutTime = new Date(Date.now() + 30 * 60 * 1000);
      (isAccountLocked as jest.Mock).mockResolvedValue({
        locked: true,
        lockedUntil: lockoutTime,
      });

      const result = await validateOAuthSecurity('locked@example.com', 'org-123', 'google');

      expect(result.allowed).toBe(false);
      expect(result.error).toBe('AccountLocked');
      expect(result.lockedUntil).toEqual(lockoutTime);
    });

    it('should allow super admins regardless of org restrictions', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-123',
        isDeleted: false,
        canLogin: true,
        isSuperAdmin: true,
      });

      (isAccountLocked as jest.Mock).mockResolvedValue({ locked: false });
      // Super admins may not have TeamMember records, which is fine
      (mockPrisma.teamMember.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await validateOAuthSecurity('admin@example.com', 'org-123', 'google');

      expect(result.allowed).toBe(true);
    });

    it('should block when auth method not allowed by organization', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-123',
        isDeleted: false,
        canLogin: true,
        isSuperAdmin: false,
      });

      (isAccountLocked as jest.Mock).mockResolvedValue({ locked: false });

      // Mock organization with auth restrictions
      (mockPrisma.organization.findUnique as jest.Mock).mockResolvedValue({
        allowedAuthMethods: ['azure-ad'], // Only Azure allowed
      });

      const result = await validateOAuthSecurity('user@example.com', 'org-123', 'google');

      expect(result.allowed).toBe(false);
      expect(result.error).toBe('AuthMethodNotAllowed');
    });

    it('should allow when auth method is in allowed list', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-123',
        isDeleted: false,
        canLogin: true,
        isSuperAdmin: false,
      });

      (isAccountLocked as jest.Mock).mockResolvedValue({ locked: false });

      (mockPrisma.organization.findUnique as jest.Mock).mockResolvedValue({
        allowedAuthMethods: ['google', 'azure-ad'],
      });

      const result = await validateOAuthSecurity('user@example.com', 'org-123', 'google');

      expect(result.allowed).toBe(true);
    });

    it('should allow when org has no auth method restrictions', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-123',
        isDeleted: false,
        canLogin: true,
        isSuperAdmin: false,
      });

      (isAccountLocked as jest.Mock).mockResolvedValue({ locked: false });

      (mockPrisma.organization.findUnique as jest.Mock).mockResolvedValue({
        allowedAuthMethods: [], // No restrictions
      });

      const result = await validateOAuthSecurity('user@example.com', 'org-123', 'google');

      expect(result.allowed).toBe(true);
    });

    it('should normalize email to lowercase', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await validateOAuthSecurity('User@EXAMPLE.com', 'org-123', 'google');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'user@example.com' },
        select: expect.any(Object),
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // UPSERT OAUTH USER
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('upsertOAuthUser', () => {
    it('should create new user when not exists', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.user.create as jest.Mock).mockResolvedValue({
        id: 'new-user-123',
        email: 'new@example.com',
        name: 'New User',
      });

      const result = await upsertOAuthUser(
        {
          email: 'new@example.com',
          name: 'New User',
          image: 'https://example.com/avatar.jpg',
          emailVerified: true,
        },
        null
      );

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'new@example.com',
          name: 'New User',
          image: 'https://example.com/avatar.jpg',
          emailVerified: expect.any(Date),
        },
      });
      expect(result.id).toBe('new-user-123');
    });

    it('should update existing user', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'existing-user',
        email: 'existing@example.com',
        name: 'Old Name',
        image: null,
      });

      (mockPrisma.user.update as jest.Mock).mockResolvedValue({
        id: 'existing-user',
        email: 'existing@example.com',
        name: 'New Name',
        image: 'https://example.com/new-avatar.jpg',
      });

      await upsertOAuthUser(
        {
          email: 'existing@example.com',
          name: 'New Name',
          image: 'https://example.com/new-avatar.jpg',
          emailVerified: false,
        },
        null
      );

      expect(mockPrisma.user.update).toHaveBeenCalled();
    });

    it('should create TeamMember if org specified and not exists', async () => {
      // No existing TeamMember
      (mockPrisma.teamMember.findFirst as jest.Mock).mockResolvedValue(null);
      // User must be created first (new auth model)
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.user.create as jest.Mock).mockResolvedValue({
        id: 'new-user',
        email: 'new@example.com',
      });
      (mockPrisma.teamMember.create as jest.Mock).mockResolvedValue({
        id: 'new-team-member',
        email: 'new@example.com',
        tenantId: 'org-123',
        userId: 'new-user',
        isAdmin: false,
      });
      (clearFailedLogins as jest.Mock).mockResolvedValue(undefined);

      const result = await upsertOAuthUser(
        { email: 'new@example.com', name: 'New', image: null },
        'org-123'
      );

      expect(mockPrisma.teamMember.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'new@example.com',
          tenantId: 'org-123',
          userId: 'new-user',
          isAdmin: false,
          isOwner: false,
        }),
      });
      expect(result.type).toBe('teamMember');
    });

    it('should update TeamMember if org specified and already exists', async () => {
      // Existing TeamMember with linked User
      (mockPrisma.teamMember.findFirst as jest.Mock).mockResolvedValue({
        id: 'existing-member',
        email: 'new@example.com',
        tenantId: 'org-123',
        userId: 'existing-user',
        name: 'Old Name',
      });
      // User also exists
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'existing-user',
        email: 'new@example.com',
      });
      (mockPrisma.teamMember.update as jest.Mock).mockResolvedValue({
        id: 'existing-member',
        email: 'new@example.com',
        tenantId: 'org-123',
        userId: 'existing-user',
        name: 'New',
      });
      (clearFailedLogins as jest.Mock).mockResolvedValue(undefined);

      const result = await upsertOAuthUser(
        { email: 'new@example.com', name: 'New', image: null },
        'org-123'
      );

      expect(mockPrisma.teamMember.create).not.toHaveBeenCalled();
      expect(mockPrisma.teamMember.update).toHaveBeenCalled();
      expect(result.type).toBe('teamMember');
    });

    it('should clear failed login attempts on successful login', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.user.create as jest.Mock).mockResolvedValue({
        id: 'new-user',
        email: 'new@example.com',
      });

      await upsertOAuthUser(
        { email: 'new@example.com', name: 'New', image: null },
        null
      );

      expect(clearFailedLogins).toHaveBeenCalledWith('new-user');
    });

    it('should normalize email to lowercase and trim', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.user.create as jest.Mock).mockResolvedValue({
        id: 'user',
        email: 'test@example.com',
      });

      await upsertOAuthUser(
        { email: '  TEST@EXAMPLE.COM  ', name: 'Test', image: null },
        null
      );

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: 'test@example.com' },
        })
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // SESSION TOKEN CREATION
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('createSessionToken', () => {
    it('should create JWT token for super admin with organization', async () => {
      // createSessionToken is now for super admins only - it queries user and org separately
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-123',
        email: 'user@example.com',
        name: 'Test User',
        image: 'https://example.com/avatar.jpg',
        role: 'USER',
        isSuperAdmin: true,
      });
      (mockPrisma.organization.findUnique as jest.Mock).mockResolvedValue({
        id: 'org-123',
        slug: 'acme',
        subscriptionTier: 'PROFESSIONAL',
        enabledModules: ['assets', 'employees'],
      });

      const token = await createSessionToken('user-123', 'org-123');

      expect(encode).toHaveBeenCalledWith({
        token: expect.objectContaining({
          sub: 'user-123',
          email: 'user@example.com',
          name: 'Test User',
          organizationId: 'org-123',
          organizationSlug: 'acme',
          subscriptionTier: 'PROFESSIONAL',
        }),
        secret: process.env.NEXTAUTH_SECRET,
        maxAge: 30 * 24 * 60 * 60,
      });
      expect(token).toBe('mock-jwt-token');
    });

    it('should not include org data if org not found', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-123',
        email: 'user@example.com',
        name: 'Test User',
        image: null,
        role: 'USER',
        isSuperAdmin: true,
      });
      (mockPrisma.organization.findUnique as jest.Mock).mockResolvedValue(null);

      await createSessionToken('user-123', 'org-999'); // Non-existent org

      expect(encode).toHaveBeenCalledWith({
        token: expect.not.objectContaining({
          organizationId: expect.anything(),
        }),
        secret: expect.any(String),
        maxAge: expect.any(Number),
      });
    });

    it('should create token without org data when orgId is null', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-123',
        email: 'user@example.com',
        name: 'Test User',
        image: null,
        role: 'USER',
        isSuperAdmin: true,
      });

      await createSessionToken('user-123', null);

      expect(encode).toHaveBeenCalledWith({
        token: expect.not.objectContaining({
          organizationId: expect.anything(),
        }),
        secret: expect.any(String),
        maxAge: expect.any(Number),
      });
      // Org query should not be made when orgId is null
      expect(mockPrisma.organization.findUnique).not.toHaveBeenCalled();
    });

    it('should throw error for non-existent user', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(createSessionToken('non-existent', null)).rejects.toThrow(
        'User not found'
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // URL UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('getBaseUrl', () => {
    it('should return NEXTAUTH_URL when set', () => {
      expect(getBaseUrl()).toBe('https://app.example.com');
    });

    it('should return VERCEL_URL with https when NEXTAUTH_URL not set', () => {
      const nextauthUrl = process.env.NEXTAUTH_URL;
      delete process.env.NEXTAUTH_URL;
      process.env.VERCEL_URL = 'my-app.vercel.app';

      expect(getBaseUrl()).toBe('https://my-app.vercel.app');

      process.env.NEXTAUTH_URL = nextauthUrl;
      delete process.env.VERCEL_URL;
    });

    it('should return localhost when no env vars set', () => {
      const nextauthUrl = process.env.NEXTAUTH_URL;
      delete process.env.NEXTAUTH_URL;
      delete process.env.VERCEL_URL;

      expect(getBaseUrl()).toBe('http://localhost:3000');

      process.env.NEXTAUTH_URL = nextauthUrl;
    });
  });

  describe('getAppDomain', () => {
    it('should return NEXT_PUBLIC_APP_DOMAIN when set', () => {
      expect(getAppDomain()).toBe('example.com');
    });

    it('should return localhost:3000 when not set', () => {
      const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN;
      delete process.env.NEXT_PUBLIC_APP_DOMAIN;

      expect(getAppDomain()).toBe('localhost:3000');

      process.env.NEXT_PUBLIC_APP_DOMAIN = appDomain;
    });
  });

  describe('getTenantUrl', () => {
    it('should build https URL for production domain', () => {
      expect(getTenantUrl('acme', '/admin')).toBe('https://acme.example.com/admin');
    });

    it('should use default /admin path', () => {
      expect(getTenantUrl('acme')).toBe('https://acme.example.com/admin');
    });

    it('should build http URL for localhost', () => {
      const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN;
      process.env.NEXT_PUBLIC_APP_DOMAIN = 'localhost:3000';

      expect(getTenantUrl('acme', '/dashboard')).toBe('http://acme.localhost:3000/dashboard');

      process.env.NEXT_PUBLIC_APP_DOMAIN = appDomain;
    });
  });
});
