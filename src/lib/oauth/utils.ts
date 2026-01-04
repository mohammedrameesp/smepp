/**
 * @file utils.ts
 * @description OAuth utility functions including encryption, state management, user management,
 *              and session creation for custom per-organization OAuth flows.
 * @module oauth
 */

import crypto from 'crypto';
import { prisma } from '@/lib/core/prisma';
import { encode } from 'next-auth/jwt';
import { isAccountLocked, clearFailedLogins, isTeamMemberLocked, clearTeamMemberFailedLogins } from '@/lib/security/account-lockout';

// ═══════════════════════════════════════════════════════════════════════════════
// ENCRYPTION CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

// SEC-007: Require separate encryption key in production
function getOAuthEncryptionKey(): string {
  const key = process.env.OAUTH_ENCRYPTION_KEY;

  if (!key) {
    // In production, require a dedicated encryption key
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'CRITICAL: OAUTH_ENCRYPTION_KEY is required in production. ' +
        'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
      );
    }

    // In development, fall back to NEXTAUTH_SECRET with warning
    const fallback = process.env.NEXTAUTH_SECRET;
    if (!fallback) {
      throw new Error('CRITICAL: OAUTH_ENCRYPTION_KEY or NEXTAUTH_SECRET environment variable is required');
    }
    console.warn(
      'WARNING: OAUTH_ENCRYPTION_KEY not set. Using NEXTAUTH_SECRET as fallback. ' +
      'Set OAUTH_ENCRYPTION_KEY in production for better security.'
    );
    return fallback;
  }

  return key;
}
const ALGORITHM = 'aes-256-gcm';

// ═══════════════════════════════════════════════════════════════════════════════
// CREDENTIAL ENCRYPTION/DECRYPTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Encrypt a string (for storing OAuth secrets)
 */
// Derive a unique salt for OAuth encryption (prevents cross-application key reuse)
const OAUTH_SALT = crypto.createHash('sha256').update('durj-oauth-encryption-v1').digest();

export function encrypt(text: string): string {
  if (!text) return '';
  const iv = crypto.randomBytes(16);
  const encryptionKey = getOAuthEncryptionKey();
  const key = crypto.scryptSync(encryptionKey, OAUTH_SALT, 32);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a string (for reading OAuth secrets)
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText || !encryptedText.includes(':')) return '';
  try {
    const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encryptionKey = getOAuthEncryptionKey();
    const key = crypto.scryptSync(encryptionKey, OAUTH_SALT, 32);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Failed to decrypt OAuth secret:', error);
    return '';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// OAUTH STATE MANAGEMENT (CSRF Protection)
// ═══════════════════════════════════════════════════════════════════════════════

interface OAuthState {
  subdomain: string;
  orgId: string | null;
  provider: 'google' | 'azure';
  timestamp: number;
  nonce: string;
  inviteToken?: string; // For invite signup flow
}

/**
 * Encrypt OAuth state for the state parameter
 */
export function encryptState(data: Omit<OAuthState, 'timestamp' | 'nonce'>): string {
  const state: OAuthState = {
    ...data,
    timestamp: Date.now(),
    nonce: crypto.randomBytes(16).toString('hex'),
  };
  const json = JSON.stringify(state);
  return encrypt(json);
}

/**
 * Decrypt and validate OAuth state
 */
export function decryptState(encrypted: string): OAuthState | null {
  try {
    const json = decrypt(encrypted);
    if (!json) return null;

    const state: OAuthState = JSON.parse(json);

    // Validate timestamp (state expires after 10 minutes)
    const TEN_MINUTES = 10 * 60 * 1000;
    if (Date.now() - state.timestamp > TEN_MINUTES) {
      console.error('OAuth state expired');
      return null;
    }

    return state;
  } catch (error) {
    console.error('Failed to decrypt OAuth state:', error);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// USER MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

interface OAuthUserInfo {
  email: string;
  name: string | null;
  image: string | null;
  emailVerified?: boolean;
}

/**
 * OAuth security validation result
 */
export interface OAuthSecurityCheckResult {
  allowed: boolean;
  error?: 'AccountDeactivated' | 'AccountLocked' | 'LoginDisabled' | 'AuthMethodNotAllowed';
  lockedUntil?: Date;
}

/**
 * Validate OAuth login security checks
 * This mirrors the security checks in NextAuth's signIn callback
 *
 * For org users: Checks TeamMember first (primary)
 * For super admins: Falls back to User table
 */
export async function validateOAuthSecurity(
  email: string,
  orgId: string | null,
  authMethod: 'google' | 'azure-ad'
): Promise<OAuthSecurityCheckResult> {
  const normalizedEmail = email.toLowerCase().trim();

  // ═══════════════════════════════════════════════════════════════════════════════
  // STEP 1: Check TeamMember first (org users) - PRIMARY PATH
  // ═══════════════════════════════════════════════════════════════════════════════
  if (orgId) {
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        email: normalizedEmail,
        tenantId: orgId,
      },
      select: {
        id: true,
        isDeleted: true,
        canLogin: true,
        tenant: {
          select: {
            allowedAuthMethods: true,
          },
        },
      },
    });

    if (teamMember) {
      // Block soft-deleted members
      if (teamMember.isDeleted) {
        return { allowed: false, error: 'AccountDeactivated' };
      }

      // Block members who cannot login
      if (!teamMember.canLogin) {
        return { allowed: false, error: 'LoginDisabled' };
      }

      // Check account lockout for TeamMember
      const lockoutCheck = await isTeamMemberLocked(teamMember.id);
      if (lockoutCheck.locked) {
        return { allowed: false, error: 'AccountLocked', lockedUntil: lockoutCheck.lockedUntil };
      }

      // Check org-level auth method restrictions
      if (teamMember.tenant.allowedAuthMethods.length > 0) {
        if (!teamMember.tenant.allowedAuthMethods.includes(authMethod)) {
          return { allowed: false, error: 'AuthMethodNotAllowed' };
        }
      }

      return { allowed: true };
    }
    // TeamMember not found for this org - check if they can be created (new user flow)
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // STEP 2: Check User table (super admins only)
  // ═══════════════════════════════════════════════════════════════════════════════
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      isDeleted: true,
      isSuperAdmin: true,
    },
  });

  // For new users, no security restrictions apply yet
  if (!existingUser) {
    return { allowed: true };
  }

  // Block soft-deleted users (deactivated accounts)
  if (existingUser.isDeleted) {
    return { allowed: false, error: 'AccountDeactivated' };
  }

  // Note: canLogin is now on TeamMember, not User
  // Super admins can always login if not deleted

  // Check account lockout
  const lockoutCheck = await isAccountLocked(existingUser.id);
  if (lockoutCheck.locked) {
    return { allowed: false, error: 'AccountLocked', lockedUntil: lockoutCheck.lockedUntil };
  }

  // Super admins bypass org-level restrictions
  if (existingUser.isSuperAdmin) {
    return { allowed: true };
  }

  // For non-super-admin Users with org context, check org auth restrictions
  if (orgId) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { allowedAuthMethods: true },
    });

    if (org?.allowedAuthMethods.length && !org.allowedAuthMethods.includes(authMethod)) {
      return { allowed: false, error: 'AuthMethodNotAllowed' };
    }
  }

  return { allowed: true };
}

/**
 * Create or update a user/team member from OAuth info
 *
 * For org users: Creates/updates TeamMember (primary)
 * For super admins/no-org: Creates/updates User (fallback)
 *
 * Returns: { type: 'teamMember' | 'user', id: string, ... }
 */
export async function upsertOAuthUser(userInfo: OAuthUserInfo, orgId: string | null) {
  const normalizedEmail = userInfo.email.toLowerCase().trim();

  // ═══════════════════════════════════════════════════════════════════════════════
  // ORG USERS: Create/update TeamMember (PRIMARY PATH)
  // ═══════════════════════════════════════════════════════════════════════════════
  if (orgId) {
    let teamMember = await prisma.teamMember.findFirst({
      where: {
        email: normalizedEmail,
        tenantId: orgId,
      },
    });

    if (!teamMember) {
      // Create new TeamMember for this org
      teamMember = await prisma.teamMember.create({
        data: {
          email: normalizedEmail,
          name: userInfo.name,
          image: userInfo.image,
          emailVerified: userInfo.emailVerified ? new Date() : null,
          tenantId: orgId,
          role: 'MEMBER',
          isOwner: false,
          isEmployee: false, // Default to non-employee, admin can upgrade later
          canLogin: true,
        },
      });
    } else {
      // Update TeamMember info if changed
      teamMember = await prisma.teamMember.update({
        where: { id: teamMember.id },
        data: {
          name: userInfo.name || teamMember.name,
          image: userInfo.image || teamMember.image,
          emailVerified: userInfo.emailVerified ? new Date() : teamMember.emailVerified,
        },
      });
    }

    // Clear any failed login attempts on successful OAuth login
    await clearTeamMemberFailedLogins(teamMember.id);

    return { type: 'teamMember' as const, ...teamMember };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // NO ORG: Create/update User (super admins, platform-level users)
  // ═══════════════════════════════════════════════════════════════════════════════
  let user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: userInfo.name,
        image: userInfo.image,
        emailVerified: userInfo.emailVerified ? new Date() : null,
      },
    });
  } else {
    // Update user info if changed
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: userInfo.name || user.name,
        image: userInfo.image || user.image,
        emailVerified: userInfo.emailVerified ? new Date() : user.emailVerified,
      },
    });
  }

  // Clear any failed login attempts on successful OAuth login
  await clearFailedLogins(user.id);

  return { type: 'user' as const, ...user };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SESSION CREATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a NextAuth-compatible session token for TeamMember
 */
export async function createTeamMemberSessionToken(memberId: string): Promise<string> {
  const teamMember = await prisma.teamMember.findUnique({
    where: { id: memberId },
    include: {
      tenant: {
        select: {
          id: true,
          slug: true,
          name: true,
          logoUrl: true,
          subscriptionTier: true,
          enabledModules: true,
        },
      },
    },
  });

  if (!teamMember) {
    throw new Error('TeamMember not found');
  }

  // Build token payload for TeamMember
  const tokenPayload: Record<string, unknown> = {
    sub: teamMember.id,
    id: teamMember.id,
    email: teamMember.email,
    name: teamMember.name,
    picture: teamMember.image,
    role: teamMember.role,
    isTeamMember: true,
    teamMemberRole: teamMember.role,
    isOwner: teamMember.isOwner,
    isEmployee: teamMember.isEmployee,
    organizationId: teamMember.tenantId,
    organizationSlug: teamMember.tenant.slug,
    organizationName: teamMember.tenant.name,
    organizationLogoUrl: teamMember.tenant.logoUrl,
    subscriptionTier: teamMember.tenant.subscriptionTier,
    enabledModules: teamMember.tenant.enabledModules,
    orgRole: teamMember.isOwner ? 'OWNER' : teamMember.role === 'ADMIN' ? 'ADMIN' : 'MEMBER',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
  };

  // Encode as JWT using NextAuth's encode function
  const token = await encode({
    token: tokenPayload,
    secret: process.env.NEXTAUTH_SECRET!,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });

  return token;
}

/**
 * Create a NextAuth-compatible session token for User (super admins only)
 * NOTE: This is only used for super admins who don't have org memberships
 */
export async function createSessionToken(userId: string, orgId: string | null): Promise<string> {
  // Get user (super admin)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      role: true,
      isSuperAdmin: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Build token payload for super admin
  const tokenPayload: Record<string, unknown> = {
    sub: user.id,
    email: user.email,
    name: user.name,
    picture: user.image,
    role: user.role,
    isSuperAdmin: user.isSuperAdmin,
    isEmployee: false, // Super admins are not employees
    isTeamMember: false, // Super admins are not org team members
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
  };

  // If orgId is provided, get org details for super admin impersonation
  if (orgId) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        slug: true,
        subscriptionTier: true,
        enabledModules: true,
      },
    });
    if (org) {
      tokenPayload.organizationId = org.id;
      tokenPayload.organizationSlug = org.slug;
      tokenPayload.subscriptionTier = org.subscriptionTier;
      tokenPayload.enabledModules = org.enabledModules;
    }
  }

  // Encode as JWT using NextAuth's encode function
  const token = await encode({
    token: tokenPayload,
    secret: process.env.NEXTAUTH_SECRET!,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });

  return token;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get the base URL for OAuth callbacks
 */
export function getBaseUrl(): string {
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'http://localhost:3000';
}

/**
 * Get the app domain (for redirecting to tenant subdomain)
 */
export function getAppDomain(): string {
  return process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost:3000';
}

/**
 * Build the tenant URL for redirects
 */
export function getTenantUrl(subdomain: string, path: string = '/admin'): string {
  const domain = getAppDomain();
  const protocol = domain.includes('localhost') ? 'http' : 'https';
  return `${protocol}://${subdomain}.${domain}${path}`;
}
