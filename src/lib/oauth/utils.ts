/**
 * @file utils.ts
 * @description OAuth utility functions including encryption, state management, user management,
 *              and session creation for custom per-organization OAuth flows.
 * @module oauth
 */

import crypto from 'crypto';
import { prisma } from '@/lib/core/prisma';
import { encode } from 'next-auth/jwt';
import { isAccountLocked, clearFailedLogins } from '@/lib/security/account-lockout';
import logger from '@/lib/core/log';
import { createBulkNotifications } from '@/features/notifications/lib/notification-service';
import { sendEmail, emailWrapper, getTenantPortalUrl, escapeHtml } from '@/lib/email';

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
    logger.warn('OAUTH_ENCRYPTION_KEY not set, using NEXTAUTH_SECRET as fallback');
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
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to decrypt OAuth secret');
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
  redirectUri?: string; // For custom domains
}

// ═══════════════════════════════════════════════════════════════════════════════
// NONCE TRACKING (Replay Attack Prevention)
// ═══════════════════════════════════════════════════════════════════════════════

// In-memory store for used nonces (prevents replay attacks)
// In production, consider using Redis for distributed deployments
const usedNonces = new Map<string, number>();

// Clean up expired nonces every 5 minutes
const NONCE_CLEANUP_INTERVAL = 5 * 60 * 1000;
const NONCE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes (matches state expiry)

let cleanupIntervalId: NodeJS.Timeout | null = null;

function startNonceCleanup() {
  if (cleanupIntervalId) return;
  cleanupIntervalId = setInterval(() => {
    const now = Date.now();
    for (const [nonce, timestamp] of usedNonces.entries()) {
      if (now - timestamp > NONCE_EXPIRY_MS) {
        usedNonces.delete(nonce);
      }
    }
  }, NONCE_CLEANUP_INTERVAL);
  // Don't prevent Node.js from exiting
  if (cleanupIntervalId.unref) {
    cleanupIntervalId.unref();
  }
}

// Start cleanup on module load
startNonceCleanup();

/**
 * Check if a nonce has been used (and mark it as used if not)
 * Returns true if the nonce is valid (not previously used), false if it's a replay
 */
function consumeNonce(nonce: string): boolean {
  if (usedNonces.has(nonce)) {
    return false; // Replay detected
  }
  usedNonces.set(nonce, Date.now());
  return true;
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
 * @param encrypted - The encrypted state string
 * @param consumeOnSuccess - If true, marks the nonce as used (default: true for callbacks)
 */
export function decryptState(encrypted: string, consumeOnSuccess: boolean = true): OAuthState | null {
  try {
    const json = decrypt(encrypted);
    if (!json) return null;

    const state: OAuthState = JSON.parse(json);

    // Validate timestamp (state expires after 10 minutes)
    const TEN_MINUTES = 10 * 60 * 1000;
    if (Date.now() - state.timestamp > TEN_MINUTES) {
      logger.warn('OAuth state expired');
      return null;
    }

    // SECURITY FIX: Prevent replay attacks by tracking used nonces
    // Each OAuth state can only be used once
    if (consumeOnSuccess && !consumeNonce(state.nonce)) {
      logger.warn('OAuth state replay detected - nonce already used');
      return null;
    }

    return state;
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to decrypt OAuth state');
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
 * Notify HR users (or admins as fallback) when a new team member joins via SSO
 * This is non-blocking - failures are logged but don't break the login flow
 */
async function notifyHROfNewMember(
  newMember: { id: string; name: string | null; email: string },
  orgId: string,
  provider: 'google' | 'azure'
): Promise<void> {
  try {
    // First, try to find users with HR access
    let recipients = await prisma.teamMember.findMany({
      where: {
        tenantId: orgId,
        hasHRAccess: true,
        isDeleted: false,
        canLogin: true,
        id: { not: newMember.id }, // Don't notify the new member themselves
      },
      select: { id: true, email: true, name: true },
    });

    // If no HR users, fallback to admins
    if (recipients.length === 0) {
      recipients = await prisma.teamMember.findMany({
        where: {
          tenantId: orgId,
          isAdmin: true,
          isDeleted: false,
          canLogin: true,
          id: { not: newMember.id },
        },
        select: { id: true, email: true, name: true },
      });
    }

    if (recipients.length === 0) {
      logger.warn({ orgId }, 'No HR users or admins found to notify about new SSO signup');
      return;
    }

    // Get organization info for email
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true, slug: true, primaryColor: true },
    });

    const memberName = escapeHtml(newMember.name || newMember.email);
    const profileUrl = getTenantPortalUrl(org?.slug || 'app', `/admin/employees/${newMember.id}`);
    const providerName = provider === 'google' ? 'Google' : 'Microsoft';

    // Create in-app notifications
    const notifications = recipients.map((recipient) => ({
      recipientId: recipient.id,
      type: 'TEAM_MEMBER_JOINED' as const,
      title: 'New Team Member Joined',
      message: `${memberName} has joined via ${providerName} SSO. Review their profile and assign an employee code.`,
      link: `/admin/employees/${newMember.id}`,
      entityType: 'TeamMember',
      entityId: newMember.id,
    }));

    await createBulkNotifications(notifications, orgId);

    // Send email notifications
    const emailContent = `
      <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 20px;">New Team Member Joined</h2>
      <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        <strong>${memberName}</strong> (${newMember.email}) has joined your organization via ${providerName} SSO.
      </p>
      <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        Please review their profile and:
      </p>
      <ul style="color: #555555; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0;">
        <li>Assign an employee code</li>
        <li>Set their department and designation</li>
        <li>Configure their access permissions</li>
      </ul>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 25px 0;">
        <tr>
          <td align="center">
            <a href="${profileUrl}" style="display: inline-block; padding: 14px 30px; background-color: ${org?.primaryColor || '#0f172a'}; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
              View Profile
            </a>
          </td>
        </tr>
      </table>
    `;

    const orgName = org?.name || 'Your Organization';
    for (const recipient of recipients) {
      sendEmail({
        to: recipient.email,
        subject: `[HR] New team member joined: ${memberName}`,
        html: emailWrapper(emailContent, orgName, org?.primaryColor || undefined),
        text: `${memberName} (${newMember.email}) has joined via ${providerName} SSO. Review their profile at ${profileUrl}`,
      }).catch((err) => {
        logger.error({ error: String(err), recipientId: recipient.id }, 'Failed to send new member notification email');
      });
    }

    logger.info({
      event: 'NEW_MEMBER_NOTIFICATION_SENT',
      newMemberId: newMember.id,
      recipientCount: recipients.length,
      orgId,
    }, 'Notified HR/admins of new SSO signup');

  } catch (error) {
    // Non-blocking - log error but don't fail the login
    logger.error({ error: String(error), orgId, newMemberId: newMember.id }, 'Failed to notify HR of new member');
  }
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

      // Check account lockout on User table (single source of truth for auth)
      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true },
      });
      if (user) {
        const lockoutCheck = await isAccountLocked(user.id);
        if (lockoutCheck.locked) {
          return { allowed: false, error: 'AccountLocked', lockedUntil: lockoutCheck.lockedUntil };
        }
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
    // First, create or find User (single source of truth for auth)
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
      // Update User email verification if needed
      if (userInfo.emailVerified && !user.emailVerified) {
        await prisma.user.update({
          where: { id: user.id },
          data: { emailVerified: new Date() },
        });
      }
    }

    // Now find or create TeamMember with userId FK
    let teamMember = await prisma.teamMember.findFirst({
      where: {
        userId: user.id,
        tenantId: orgId,
      },
    });

    if (!teamMember) {
      // Create new TeamMember for this org
      // SSO logins without invitation default to employee (admin can change later)
      teamMember = await prisma.teamMember.create({
        data: {
          userId: user.id,
          email: normalizedEmail, // Denormalized for queries
          name: userInfo.name,
          image: userInfo.image,
          tenantId: orgId,
          isAdmin: false,
          isOwner: false,
          isEmployee: true, // Default to employee for SSO self-signup
          canLogin: true,
        },
      });

      // Determine provider from OAuth image URL
      const provider = userInfo.image?.includes('google') ? 'google' : 'azure';

      // AUDIT: Log new OAuth account creation
      logger.info({
        event: 'OAUTH_ACCOUNT_CREATED',
        teamMemberId: teamMember.id,
        userId: user.id,
        email: normalizedEmail,
        orgId,
        provider,
      }, 'New OAuth account created for TeamMember');

      // Notify HR/admins about new SSO signup (non-blocking)
      notifyHROfNewMember(
        { id: teamMember.id, name: teamMember.name, email: teamMember.email },
        orgId,
        provider as 'google' | 'azure'
      ).catch(() => {}); // Fire and forget
    } else {
      // SECURITY AUDIT: Log OAuth login to existing account
      // This helps detect potential account takeover attempts
      const isFirstOAuthLogin = !teamMember.image && userInfo.image;
      if (isFirstOAuthLogin) {
        logger.info({
          event: 'OAUTH_ACCOUNT_LINKED',
          teamMemberId: teamMember.id,
          email: normalizedEmail,
          orgId,
          provider: userInfo.image?.includes('google') ? 'google' : 'azure',
        }, 'OAuth linked to existing TeamMember account');
      }

      // Update TeamMember info if changed
      teamMember = await prisma.teamMember.update({
        where: { id: teamMember.id },
        data: {
          name: userInfo.name || teamMember.name,
          image: userInfo.image || teamMember.image,
        },
      });
    }

    // Clear any failed login attempts on successful OAuth login (on User table)
    await clearFailedLogins(user.id);

    return { type: 'teamMember' as const, ...teamMember };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // NO ORG: Create/update User (super admins, platform-level users)
  // ═══════════════════════════════════════════════════════════════════════════════
  let user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      emailVerified: true,
      passwordHash: true,
    },
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

    // AUDIT: Log new OAuth user creation
    logger.info({
      event: 'OAUTH_USER_CREATED',
      userId: user.id,
      email: normalizedEmail,
      provider: userInfo.image?.includes('google') ? 'google' : 'azure',
    }, 'New OAuth user account created');
  } else {
    // SECURITY AUDIT: Log OAuth login to existing account
    const isFirstOAuthLogin = !user.image && userInfo.image;
    if (isFirstOAuthLogin) {
      logger.info({
        event: 'OAUTH_USER_LINKED',
        userId: user.id,
        email: normalizedEmail,
        hasPassword: !!user.passwordHash,
        provider: userInfo.image?.includes('google') ? 'google' : 'azure',
      }, 'OAuth linked to existing user account');
    }

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
  // Compute role from isAdmin boolean for backward compatibility with session
  const computedRole = teamMember.isAdmin ? 'ADMIN' : 'MEMBER';
  const tokenPayload: Record<string, unknown> = {
    sub: teamMember.id,
    id: teamMember.id,
    userId: teamMember.userId, // User ID for auth/security checks
    email: teamMember.email,
    name: teamMember.name,
    picture: teamMember.image,
    role: computedRole,
    isTeamMember: true,
    teamMemberRole: computedRole,
    isOwner: teamMember.isOwner,
    isEmployee: teamMember.isEmployee,
    onboardingComplete: teamMember.onboardingComplete ?? false,
    isAdmin: teamMember.isAdmin,
    organizationId: teamMember.tenantId,
    organizationSlug: teamMember.tenant.slug,
    organizationName: teamMember.tenant.name,
    organizationLogoUrl: teamMember.tenant.logoUrl,
    subscriptionTier: teamMember.tenant.subscriptionTier,
    enabledModules: teamMember.tenant.enabledModules,
    orgRole: teamMember.isOwner ? 'OWNER' : teamMember.isAdmin ? 'ADMIN' : 'MEMBER',
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

/**
 * Validate that the user's email domain is allowed for the organization
 */
export function validateEmailDomain(
  email: string,
  allowedDomains: string[],
  enforceDomainRestriction: boolean
): boolean {
  if (!enforceDomainRestriction || allowedDomains.length === 0) {
    return true;
  }

  const emailDomain = email.split('@')[1]?.toLowerCase();
  return allowedDomains.some(d => d.toLowerCase() === emailDomain);
}
