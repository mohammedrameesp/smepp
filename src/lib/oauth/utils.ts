import crypto from 'crypto';
import { prisma } from '@/lib/core/prisma';
import { encode } from 'next-auth/jwt';

// ═══════════════════════════════════════════════════════════════════════════════
// ENCRYPTION CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const ENCRYPTION_KEY = process.env.OAUTH_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || '';
const ALGORITHM = 'aes-256-gcm';

// ═══════════════════════════════════════════════════════════════════════════════
// CREDENTIAL ENCRYPTION/DECRYPTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Encrypt a string (for storing OAuth secrets)
 */
export function encrypt(text: string): string {
  if (!text) return '';
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
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
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
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
 * Create or update a user from OAuth info
 */
export async function upsertOAuthUser(userInfo: OAuthUserInfo, orgId: string | null) {
  const normalizedEmail = userInfo.email.toLowerCase().trim();

  // Find or create user
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

  // If org is specified, ensure user is a member
  if (orgId) {
    const existingMembership = await prisma.organizationUser.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: user.id,
        },
      },
    });

    if (!existingMembership) {
      // Auto-add user as member if they sign up via OAuth for this org
      await prisma.organizationUser.create({
        data: {
          organizationId: orgId,
          userId: user.id,
          role: 'MEMBER',
          isOwner: false,
        },
      });
    }
  }

  return user;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SESSION CREATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a NextAuth-compatible session token
 */
export async function createSessionToken(userId: string, orgId: string | null): Promise<string> {
  // Get user with their organization membership
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      organizationMemberships: {
        include: {
          organization: {
            select: {
              id: true,
              slug: true,
              subscriptionTier: true,
              enabledModules: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Find the relevant organization membership
  let membership = user.organizationMemberships.find((m: { organizationId: string }) => m.organizationId === orgId);
  if (!membership && user.organizationMemberships.length > 0) {
    membership = user.organizationMemberships[0];
  }

  // Build token payload
  const tokenPayload: Record<string, unknown> = {
    sub: user.id,
    email: user.email,
    name: user.name,
    picture: user.image,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
  };

  if (membership) {
    tokenPayload.organizationId = membership.organizationId;
    tokenPayload.organizationSlug = membership.organization.slug;
    tokenPayload.orgRole = membership.role;
    tokenPayload.isOwner = membership.isOwner;
    tokenPayload.subscriptionTier = membership.organization.subscriptionTier;
    tokenPayload.enabledModules = membership.organization.enabledModules;
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
