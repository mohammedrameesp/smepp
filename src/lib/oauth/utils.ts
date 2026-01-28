/**
 * @file utils.ts
 * @description OAuth utility functions including encryption, state management, user management,
 *              and session creation for custom per-organization OAuth flows.
 * @module oauth
 *
 * @example
 * ```typescript
 * // Encrypt OAuth state for CSRF protection
 * const state = encryptState({ subdomain: 'acme', orgId: 'org-123', provider: 'google' });
 *
 * // In callback, decrypt and validate
 * const decoded = decryptState(state);
 *
 * // Validate security and create user
 * const securityCheck = await validateOAuthSecurity(email, orgId, 'google');
 * const teamMember = await upsertOAuthUser(userInfo, orgId);
 * const token = await createTeamMemberSessionToken(teamMember.id);
 * ```
 *
 * @security
 * - Uses AES-256-GCM for encryption with authenticated encryption
 * - Implements nonce tracking to prevent replay attacks
 * - Requires separate OAUTH_ENCRYPTION_KEY in production
 * - Audit logs all OAuth account creation and linking events
 */

import crypto from 'crypto';
import { prisma } from '@/lib/core/prisma';
import { encode } from 'next-auth/jwt';
import { isAccountLocked, clearFailedLogins } from '@/lib/security/account-lockout';
import logger from '@/lib/core/log';
import { createBulkNotifications } from '@/features/notifications/lib/notification-service';
import { sendEmail, emailWrapper, getTenantPortalUrl, escapeHtml } from '@/lib/email';
import { deriveOrgRole } from '@/lib/access-control';

// ═══════════════════════════════════════════════════════════════════════════════
// ENCRYPTION CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

/** AES-256-GCM provides authenticated encryption */
const ALGORITHM = 'aes-256-gcm';

/** Unique salt for OAuth encryption (prevents cross-application key reuse) */
const OAUTH_SALT = crypto.createHash('sha256').update('durj-oauth-encryption-v1').digest();

/**
 * Get the OAuth encryption key from environment
 *
 * @security SEC-007: Requires separate encryption key in production
 * @returns Encryption key string
 * @throws Error if no encryption key is configured
 */
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

// ═══════════════════════════════════════════════════════════════════════════════
// CREDENTIAL ENCRYPTION/DECRYPTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Encrypt a string using AES-256-GCM
 *
 * Used for storing OAuth client secrets in the database.
 * Output format: `iv:authTag:ciphertext` (all hex-encoded)
 *
 * @param text - Plain text to encrypt
 * @returns Encrypted string in format `iv:authTag:ciphertext`, or empty string if input is empty
 *
 * @security Uses AES-256-GCM with random IV for each encryption
 *
 * @example
 * ```typescript
 * const encrypted = encrypt('client-secret-123');
 * // Returns: "a1b2c3...:d4e5f6...:789abc..."
 * ```
 */
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
 * Decrypt a string encrypted with the encrypt() function
 *
 * @param encryptedText - Encrypted string in format `iv:authTag:ciphertext`
 * @returns Decrypted plain text, or empty string if decryption fails
 *
 * @security Validates authentication tag to detect tampering
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

/**
 * OAuth state payload structure
 * Encrypted and passed through the OAuth flow for CSRF protection
 */
interface OAuthState {
  /** Organization subdomain (e.g., 'acme') */
  subdomain: string;
  /** Organization ID */
  orgId: string;
  /** OAuth provider identifier */
  provider: 'google' | 'azure';
  /** Unix timestamp when state was created */
  timestamp: number;
  /** Random nonce for replay attack prevention */
  nonce: string;
  /** Optional invite token for signup via invitation */
  inviteToken?: string;
  /** Custom redirect URI for organizations with custom domains */
  redirectUri?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// NONCE TRACKING (Replay Attack Prevention)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * In-memory store for used nonces (prevents replay attacks)
 *
 * @security
 * - Each nonce can only be used once
 * - Nonces expire after 10 minutes (matching state expiry)
 * - For distributed deployments, consider using Redis instead
 */
const usedNonces = new Map<string, number>();

/** Cleanup interval for expired nonces (5 minutes) */
const NONCE_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

/** Nonce expiry time (10 minutes, matches state expiry) */
const NONCE_EXPIRY_MS = 10 * 60 * 1000;

/** State expiry time (10 minutes) */
const STATE_EXPIRY_MS = 10 * 60 * 1000;

let cleanupIntervalId: NodeJS.Timeout | null = null;

/**
 * Start the nonce cleanup interval
 * Automatically removes expired nonces to prevent memory growth
 */
function startNonceCleanup(): void {
  if (cleanupIntervalId) return;
  cleanupIntervalId = setInterval(() => {
    const now = Date.now();
    for (const [nonce, timestamp] of usedNonces.entries()) {
      if (now - timestamp > NONCE_EXPIRY_MS) {
        usedNonces.delete(nonce);
      }
    }
  }, NONCE_CLEANUP_INTERVAL_MS);
  // Don't prevent Node.js from exiting
  if (cleanupIntervalId.unref) {
    cleanupIntervalId.unref();
  }
}

// Start cleanup on module load
startNonceCleanup();

/**
 * Check if a nonce has been used and mark it as used if not
 *
 * @param nonce - Nonce string to check
 * @returns true if nonce is valid (not previously used), false if replay detected
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
 *
 * Creates an encrypted state payload containing subdomain, orgId, provider,
 * timestamp, and a random nonce for CSRF and replay protection.
 *
 * @param data - State data (without timestamp and nonce, which are auto-generated)
 * @returns Encrypted state string for use as OAuth state parameter
 *
 * @example
 * ```typescript
 * const state = encryptState({
 *   subdomain: 'acme',
 *   orgId: 'org-123',
 *   provider: 'google',
 *   inviteToken: 'invite-abc', // optional
 * });
 * ```
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
 *
 * Validates:
 * - State can be decrypted (not tampered)
 * - State has not expired (10 minute limit)
 * - Nonce has not been used before (replay prevention)
 *
 * @param encrypted - Encrypted state string from OAuth callback
 * @param consumeOnSuccess - If true, marks the nonce as used (default: true)
 *                           Set to false when reading state for error handling
 * @returns Decoded state object, or null if validation fails
 *
 * @security
 * - Validates timestamp to prevent old states from being reused
 * - Tracks nonces to prevent replay attacks
 */
export function decryptState(encrypted: string, consumeOnSuccess: boolean = true): OAuthState | null {
  try {
    const json = decrypt(encrypted);
    if (!json) return null;

    const state: OAuthState = JSON.parse(json);

    // Validate timestamp (state expires after 10 minutes)
    if (Date.now() - state.timestamp > STATE_EXPIRY_MS) {
      logger.warn('OAuth state expired');
      return null;
    }

    // Prevent replay attacks by tracking used nonces
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

/**
 * OAuth user info from provider
 */
interface OAuthUserInfo {
  email: string;
  name: string | null;
  image: string | null;
  emailVerified?: boolean;
}

/**
 * Notify HR users (or admins as fallback) when a new team member joins via SSO
 *
 * This is non-blocking - failures are logged but don't break the login flow.
 * Sends both in-app notifications and email notifications.
 *
 * @param newMember - New team member info
 * @param orgId - Organization ID
 * @param provider - OAuth provider used for signup
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
        <strong>${memberName}</strong> (${escapeHtml(newMember.email)}) has joined your organization via ${providerName} SSO.
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

// ═══════════════════════════════════════════════════════════════════════════════
// SECURITY VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Result of OAuth security validation
 */
export interface OAuthSecurityCheckResult {
  /** Whether the login is allowed */
  allowed: boolean;
  /** Error code if not allowed */
  error?: 'AccountDeactivated' | 'AccountLocked' | 'LoginDisabled' | 'AuthMethodNotAllowed';
  /** When the account lockout expires (if applicable) */
  lockedUntil?: Date;
}

/**
 * Validate OAuth login security checks
 *
 * Mirrors the security checks in NextAuth's signIn callback to ensure
 * consistent security enforcement for custom OAuth flows.
 *
 * Checks (in order):
 * 1. TeamMember exists → check isDeleted, canLogin, lockout, auth method
 * 2. User exists (new signup) → check isDeleted, lockout, org auth restrictions
 * 3. New user → allow (no restrictions yet)
 *
 * @param email - User's email address
 * @param orgId - Organization ID (from tenant subdomain)
 * @param authMethod - OAuth provider being used
 * @returns Security check result with allowed status and error details
 *
 * @security
 * - Blocks soft-deleted accounts
 * - Blocks locked accounts (brute-force protection)
 * - Enforces organization auth method restrictions
 */
export async function validateOAuthSecurity(
  email: string,
  orgId: string,
  authMethod: 'google' | 'azure-ad'
): Promise<OAuthSecurityCheckResult> {
  const normalizedEmail = email.toLowerCase().trim();

  // ═══════════════════════════════════════════════════════════════════════════════
  // STEP 1: Check TeamMember first (existing org users)
  // ═══════════════════════════════════════════════════════════════════════════════
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

    // Block members who cannot login (e.g., drivers, field workers)
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

  // ═══════════════════════════════════════════════════════════════════════════════
  // STEP 2: Check User table (new users signing up via OAuth)
  // ═══════════════════════════════════════════════════════════════════════════════
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      isDeleted: true,
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

  // Check account lockout
  const lockoutCheck = await isAccountLocked(existingUser.id);
  if (lockoutCheck.locked) {
    return { allowed: false, error: 'AccountLocked', lockedUntil: lockoutCheck.lockedUntil };
  }

  // Check org auth restrictions for new signups
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { allowedAuthMethods: true },
  });

  if (org?.allowedAuthMethods.length && !org.allowedAuthMethods.includes(authMethod)) {
    return { allowed: false, error: 'AuthMethodNotAllowed' };
  }

  return { allowed: true };
}

// ═══════════════════════════════════════════════════════════════════════════════
// USER UPSERT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * TeamMember data returned from upsert operation
 */
export interface UpsertOAuthUserResult {
  id: string;
  userId: string | null;
  email: string;
  name: string | null;
  image: string | null;
  tenantId: string;
  isAdmin: boolean;
  isOwner: boolean;
  isEmployee: boolean;
  canLogin: boolean;
}

/**
 * Create or update a TeamMember from OAuth info
 *
 * OAuth flows always have an orgId (from tenant subdomain).
 * Creates a User record for auth tracking, then creates/updates TeamMember.
 *
 * For new SSO signups without invitation:
 * - Creates User for auth/security tracking
 * - Creates TeamMember with isEmployee=true, isAdmin=false
 * - Notifies HR users about the new signup
 *
 * @param userInfo - User profile from OAuth provider
 * @param orgId - Organization ID
 * @returns TeamMember record (created or updated)
 *
 * @security
 * - Audit logs all new account creations
 * - Audit logs first-time OAuth linking to existing accounts
 * - Clears failed login attempts on successful OAuth login
 */
export async function upsertOAuthUser(
  userInfo: OAuthUserInfo,
  orgId: string
): Promise<UpsertOAuthUserResult> {
  const normalizedEmail = userInfo.email.toLowerCase().trim();

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
    // Note: This is a heuristic - Google images contain 'google' in URL
    const provider = userInfo.image?.includes('google') ? 'google' : 'azure';

    // Audit log: New OAuth account creation
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
    // Audit log: First-time OAuth linking (security monitoring)
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

  return { ...teamMember };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SESSION CREATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a NextAuth-compatible session token for TeamMember
 *
 * Builds a JWT token containing all session data needed by the application,
 * including user info, organization context, and permissions.
 *
 * @param memberId - TeamMember ID to create session for
 * @returns Encoded JWT session token
 * @throws Error if TeamMember not found
 *
 * @security Token is signed with NEXTAUTH_SECRET
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
  const computedRole = deriveOrgRole({ isAdmin: teamMember.isAdmin });
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
    orgRole: deriveOrgRole(teamMember),
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
  };

  // Validate NEXTAUTH_SECRET exists
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('NEXTAUTH_SECRET environment variable is required');
  }

  // Encode as JWT using NextAuth's encode function
  const token = await encode({
    token: tokenPayload,
    secret,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });

  return token;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get the base URL for OAuth callbacks
 *
 * Priority:
 * 1. NEXTAUTH_URL environment variable
 * 2. VERCEL_URL (with https://)
 * 3. localhost:3000 fallback
 *
 * @returns Base URL string
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
 * Get the app domain for tenant subdomain URLs
 *
 * @returns App domain (e.g., 'durj.com' or 'localhost:3000')
 */
export function getAppDomain(): string {
  return process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost:3000';
}

/**
 * Build the tenant URL for redirects
 *
 * @param subdomain - Organization subdomain (e.g., 'acme')
 * @param path - Path to append (defaults to '/admin')
 * @returns Full tenant URL (e.g., 'https://acme.durj.com/admin')
 */
export function getTenantUrl(subdomain: string, path: string = '/admin'): string {
  const domain = getAppDomain();
  const protocol = domain.includes('localhost') ? 'http' : 'https';
  return `${protocol}://${subdomain}.${domain}${path}`;
}

/**
 * Validate that the user's email domain is allowed for the organization
 *
 * Used to enforce domain restrictions (e.g., only allow @company.com emails).
 *
 * @param email - User's email address
 * @param allowedDomains - List of allowed email domains
 * @param enforceDomainRestriction - Whether domain restriction is enabled
 * @returns true if email domain is allowed, false otherwise
 *
 * @example
 * ```typescript
 * const allowed = validateEmailDomain('user@acme.com', ['acme.com'], true);
 * // Returns: true
 *
 * const notAllowed = validateEmailDomain('user@gmail.com', ['acme.com'], true);
 * // Returns: false
 * ```
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
