/**
 * @file auth.ts
 * @description NextAuth.js configuration for multi-tenant authentication with support for
 *              Google OAuth, Azure AD, and email/password credentials. Handles tenant-scoped
 *              sessions, account linking, and security measures (lockout, 2FA enforcement).
 * @module auth
 */

import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import AzureADProvider from 'next-auth/providers/azure-ad';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from './prisma';
import { SubscriptionTier } from '@prisma/client';
import bcrypt from 'bcryptjs';
import {
  isAccountLocked,
  recordFailedLogin,
  clearFailedLogins,
} from '@/lib/security/account-lockout';
import logger from '@/lib/core/log';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface OrganizationInfo {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  logoUrlInverse: string | null;
  tier: SubscriptionTier;
  enabledModules: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECURITY: Validate required environment variables
// ═══════════════════════════════════════════════════════════════════════════════

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error(
    'NEXTAUTH_SECRET environment variable is required. ' +
    'Generate one with: openssl rand -base64 32'
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUILD PROVIDERS
// ═══════════════════════════════════════════════════════════════════════════════

const providers: NextAuthOptions['providers'] = [];

// Google OAuth (primary for SaaS)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: 'select_account',
        },
      },
    })
  );
}

// Microsoft/Azure AD (for enterprise customers)
// SECURITY: In production, always set AZURE_AD_TENANT_ID to restrict to your organization
// Using 'common' allows ANY Microsoft account - only use for testing/development
if (process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET) {
  const azureTenantId = process.env.AZURE_AD_TENANT_ID;
  if (!azureTenantId && process.env.NODE_ENV === 'production') {
    console.warn('[Auth] WARNING: AZURE_AD_TENANT_ID not set - Azure AD login disabled in production for security');
  }

  if (azureTenantId || process.env.NODE_ENV !== 'production') {
    providers.push(
      AzureADProvider({
        clientId: process.env.AZURE_AD_CLIENT_ID,
        clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
        tenantId: azureTenantId || 'common', // 'common' only allowed in non-production
        authorization: {
          params: {
            prompt: 'select_account',
          },
        },
      })
    );
  }
}

// Email/Password credentials (for users who signed up with email)
// NEW: Always check User first (single source of truth for auth), then load TeamMember for org context
providers.push(
  CredentialsProvider({
    id: 'credentials',
    name: 'Email',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
      orgSlug: { label: 'Organization Slug', type: 'text' },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        return null;
      }

      const email = credentials.email.toLowerCase().trim();
      const orgSlug = credentials.orgSlug?.toLowerCase().trim() || null;

      // STEP 1: Find User by email (single source of truth for authentication)
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          name: true,
          passwordHash: true,
          isDeleted: true,
          isSuperAdmin: true,
        },
      });

      if (!user || !user.passwordHash) {
        return null;
      }

      // SECURITY: Check if account is locked (brute-force protection)
      const lockStatus = await isAccountLocked(user.id);
      if (lockStatus.locked) {
        const minutesRemaining = lockStatus.lockedUntil
          ? Math.ceil((lockStatus.lockedUntil.getTime() - Date.now()) / 60000)
          : 5;
        throw new Error(`Account temporarily locked. Try again in ${minutesRemaining} minutes.`);
      }

      // Block soft-deleted users
      if (user.isDeleted) {
        throw new Error('This account has been deactivated');
      }

      // Verify password against User table
      const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
      if (!isValid) {
        // SECURITY: Record failed login attempt
        const lockResult = await recordFailedLogin(user.id);
        if (lockResult.locked) {
          const minutesRemaining = lockResult.lockedUntil
            ? Math.ceil((lockResult.lockedUntil.getTime() - Date.now()) / 60000)
            : 5;
          throw new Error(`Too many failed attempts. Account locked for ${minutesRemaining} minutes.`);
        }
        return null;
      }

      // SECURITY: Clear failed login attempts on successful login
      await clearFailedLogins(user.id);

      // STEP 2: For org login, find TeamMember by userId + org
      if (orgSlug) {
        const teamMember = await prisma.teamMember.findFirst({
          where: {
            userId: user.id,
            tenant: { slug: { equals: orgSlug, mode: 'insensitive' as const } },
          },
          select: {
            id: true,
            email: true,
            name: true,
            canLogin: true,
            isDeleted: true,
            isOwner: true,
            isEmployee: true,
            onboardingComplete: true,
            isAdmin: true,
            hasOperationsAccess: true,
            hasHRAccess: true,
            hasFinanceAccess: true,
            canApprove: true,
            permissionsUpdatedAt: true,
            tenant: {
              select: {
                id: true,
                name: true,
                slug: true,
                logoUrl: true,
                logoUrlInverse: true,
                subscriptionTier: true,
                enabledModules: true,
              },
            },
          },
        });

        if (!teamMember) {
          throw new Error('You are not a member of this organization');
        }

        // Block soft-deleted members
        if (teamMember.isDeleted) {
          throw new Error('This account has been deactivated');
        }

        // Block members who cannot login (org-level control)
        if (!teamMember.canLogin) {
          throw new Error('This account is not enabled for login');
        }

        // Return with org context - store both userId and memberId
        return {
          id: teamMember.id, // TeamMember ID for session (existing pattern)
          email: teamMember.email,
          name: teamMember.name,
          userId: user.id, // Store User ID for auth operations
          isTeamMember: true,
          isOwner: teamMember.isOwner,
          isEmployee: teamMember.isEmployee,
          isAdmin: teamMember.isAdmin,
          hasOperationsAccess: teamMember.hasOperationsAccess,
          hasHRAccess: teamMember.hasHRAccess,
          hasFinanceAccess: teamMember.hasFinanceAccess,
          canApprove: teamMember.canApprove,
          permissionsUpdatedAt: teamMember.permissionsUpdatedAt?.toISOString() || null,
          organizationId: teamMember.tenant.id,
          organizationSlug: teamMember.tenant.slug,
          organizationName: teamMember.tenant.name,
          organizationLogoUrl: teamMember.tenant.logoUrl,
          organizationLogoUrlInverse: teamMember.tenant.logoUrlInverse,
          subscriptionTier: teamMember.tenant.subscriptionTier,
          enabledModules: teamMember.tenant.enabledModules,
        };
      }

      // STEP 3: Super admin login (no org context)
      if (user.isSuperAdmin) {
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          isSuperAdmin: true,
          isTeamMember: false,
        };
      }

      // User exists but no org context provided and not super admin
      // Try to find their first org membership
      const teamMember = await prisma.teamMember.findFirst({
        where: { userId: user.id, isDeleted: false },
        orderBy: { joinedAt: 'asc' },
        select: {
          id: true,
          email: true,
          name: true,
          canLogin: true,
          isOwner: true,
          isEmployee: true,
          onboardingComplete: true,
          isAdmin: true,
          hasOperationsAccess: true,
          hasHRAccess: true,
          hasFinanceAccess: true,
          canApprove: true,
          permissionsUpdatedAt: true,
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
              logoUrlInverse: true,
              subscriptionTier: true,
              enabledModules: true,
            },
          },
        },
      });

      if (teamMember) {
        if (!teamMember.canLogin) {
          throw new Error('This account is not enabled for login');
        }

        return {
          id: teamMember.id,
          email: teamMember.email,
          name: teamMember.name,
          userId: user.id,
          isTeamMember: true,
          isOwner: teamMember.isOwner,
          isEmployee: teamMember.isEmployee,
          isAdmin: teamMember.isAdmin,
          hasOperationsAccess: teamMember.hasOperationsAccess,
          hasHRAccess: teamMember.hasHRAccess,
          hasFinanceAccess: teamMember.hasFinanceAccess,
          canApprove: teamMember.canApprove,
          permissionsUpdatedAt: teamMember.permissionsUpdatedAt?.toISOString() || null,
          organizationId: teamMember.tenant.id,
          organizationSlug: teamMember.tenant.slug,
          organizationName: teamMember.tenant.name,
          organizationLogoUrl: teamMember.tenant.logoUrl,
          organizationLogoUrlInverse: teamMember.tenant.logoUrlInverse,
          subscriptionTier: teamMember.tenant.subscriptionTier,
          enabledModules: teamMember.tenant.enabledModules,
        };
      }

      // No org membership found - user needs to be invited to an org
      return null;
    },
  })
);

// Super Admin credentials provider (validates login token with 2FA enforcement)
providers.push(
  CredentialsProvider({
    id: 'super-admin-credentials',
    name: 'Super Admin',
    credentials: {
      loginToken: { label: 'Login Token', type: 'text' },
    },
    async authorize(credentials) {
      if (!credentials?.loginToken) {
        return null;
      }

      // NEXTAUTH_SECRET is validated at module load - guaranteed to exist
      const JWT_SECRET = process.env.NEXTAUTH_SECRET!;

      try {
        // Verify the login token
        const jwt = await import('jsonwebtoken');
        const payload = jwt.default.verify(credentials.loginToken, JWT_SECRET) as {
          userId: string;
          email: string;
          purpose: string;
          twoFactorVerified?: boolean;
        };

        // Ensure the token is for super-admin login
        if (payload.purpose !== 'super-admin-login') {
          console.error('Invalid token purpose:', payload.purpose);
          return null;
        }

        // Get the user and verify super admin status
        const user = await prisma.user.findUnique({
          where: { id: payload.userId },
          select: {
            id: true,
            email: true,
            name: true,
            isSuperAdmin: true,
            twoFactorEnabled: true,
          },
        });

        if (!user || !user.isSuperAdmin) {
          console.error('User not found or not super admin');
          return null;
        }

        // CRITICAL: If 2FA is enabled, the token MUST have twoFactorVerified: true
        if (user.twoFactorEnabled && !payload.twoFactorVerified) {
          console.error('2FA required but not verified in token');
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          isSuperAdmin: true,
          isTeamMember: false,
        };
      } catch (error) {
        console.error('Super admin login token verification failed:', error);
        return null;
      }
    },
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get organization info for a TeamMember by member ID
 */
async function getTeamMemberOrganization(memberId: string): Promise<{
  organization: OrganizationInfo;
  isOwner: boolean;
  isEmployee: boolean;
  onboardingComplete: boolean;
  isAdmin: boolean;
  hasOperationsAccess: boolean;
  hasHRAccess: boolean;
  hasFinanceAccess: boolean;
  canApprove: boolean;
  permissionsUpdatedAt: string | null;
} | null> {
  const member = await prisma.teamMember.findUnique({
    where: { id: memberId },
    select: {
      isOwner: true,
      isEmployee: true,
      onboardingComplete: true,
      isAdmin: true,
      hasOperationsAccess: true,
      hasHRAccess: true,
      hasFinanceAccess: true,
      canApprove: true,
      permissionsUpdatedAt: true,
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          logoUrlInverse: true,
          subscriptionTier: true,
          enabledModules: true,
        },
      },
    },
  });

  if (!member) {
    return null;
  }

  return {
    organization: {
      id: member.tenant.id,
      name: member.tenant.name,
      slug: member.tenant.slug,
      logoUrl: member.tenant.logoUrl,
      logoUrlInverse: member.tenant.logoUrlInverse,
      tier: member.tenant.subscriptionTier,
      enabledModules: member.tenant.enabledModules,
    },
    isOwner: member.isOwner,
    isEmployee: member.isEmployee,
    onboardingComplete: member.onboardingComplete ?? false,
    isAdmin: member.isAdmin,
    hasOperationsAccess: member.hasOperationsAccess,
    hasHRAccess: member.hasHRAccess,
    hasFinanceAccess: member.hasFinanceAccess,
    canApprove: member.canApprove,
    permissionsUpdatedAt: member.permissionsUpdatedAt?.toISOString() || null,
  };
}

/**
 * Get the user's primary organization membership (legacy - for super admin OAuth)
 * Uses userId FK to find TeamMember
 */
async function _getUserOrganization(userId: string): Promise<OrganizationInfo | null> {
  // Find TeamMember by userId FK
  const membership = await prisma.teamMember.findFirst({
    where: { userId, isDeleted: false },
    orderBy: { joinedAt: 'asc' }, // Get the oldest (first) organization
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          logoUrlInverse: true,
          subscriptionTier: true,
          enabledModules: true,
        },
      },
    },
  });

  if (!membership) {
    return null;
  }

  return {
    id: membership.tenant.id,
    name: membership.tenant.name,
    slug: membership.tenant.slug,
    logoUrl: membership.tenant.logoUrl,
    logoUrlInverse: membership.tenant.logoUrlInverse,
    tier: membership.tenant.subscriptionTier,
    enabledModules: membership.tenant.enabledModules,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH OPTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers,
  callbacks: {
    async signIn({ user, account }) {
      try {
        // Map NextAuth provider ID to our auth method names
        const providerToAuthMethod: Record<string, string> = {
          'google': 'google',
          'azure-ad': 'azure-ad',
          'credentials': 'credentials',
          'super-admin-credentials': 'credentials',
        };

        const authMethod = account?.provider ? providerToAuthMethod[account.provider] : null;

        // For OAuth providers, check User and TeamMember restrictions
        if (account?.provider && account.provider !== 'credentials' && account.provider !== 'super-admin-credentials' && user.email) {
          const normalizedEmail = user.email.toLowerCase().trim();
          const emailDomain = normalizedEmail.split('@')[1];
          const superAdminEmail = process.env.SUPER_ADMIN_EMAIL?.toLowerCase().trim();
          const isSuperAdmin = superAdminEmail === normalizedEmail;

          // Check User table first (for account status and OAuth account linking)
          const existingUser = await prisma.user.findUnique({
            where: { email: normalizedEmail },
            include: { accounts: true },
          });

          if (existingUser) {
            // Block soft-deleted users
            if (existingUser.isDeleted) {
              return '/login?error=AccountDeactivated';
            }

            // Check if this OAuth account is already linked
            const accountExists = existingUser.accounts.some(
              (acc) =>
                acc.provider === account.provider &&
                acc.providerAccountId === account.providerAccountId
            );

            if (!accountExists) {
              // Link the OAuth account to existing user
              await prisma.account.create({
                data: {
                  userId: existingUser.id,
                  type: account.type,
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                  access_token: account.access_token,
                  expires_at: account.expires_at,
                  refresh_token: account.refresh_token,
                  id_token: account.id_token,
                  scope: account.scope,
                  session_state: account.session_state as string | null,
                  token_type: account.token_type,
                },
              });
            }

            // Check TeamMember by userId FK (org-level restrictions)
            const teamMember = await prisma.teamMember.findFirst({
              where: { userId: existingUser.id, isDeleted: false },
              include: {
                tenant: {
                  select: {
                    id: true,
                    name: true,
                    allowedAuthMethods: true,
                    allowedEmailDomains: true,
                    enforceDomainRestriction: true,
                  },
                },
              },
            });

            if (teamMember) {
              // Block members who cannot login (org-level control)
              if (!teamMember.canLogin) {
                return false;
              }

              // Check auth restrictions for org
              const org = teamMember.tenant;

              // Check auth method restriction
              if (org.allowedAuthMethods.length > 0 && authMethod) {
                if (!org.allowedAuthMethods.includes(authMethod)) {
                  return '/login?error=AuthMethodNotAllowed';
                }
              }

              // Check email domain restriction
              if (org.enforceDomainRestriction && org.allowedEmailDomains.length > 0) {
                if (!org.allowedEmailDomains.includes(emailDomain)) {
                  return '/login?error=DomainNotAllowed';
                }
              }
            }

            // SEC-CRIT-3: Removed auto-promotion to super admin
            // Auto-promotion via SUPER_ADMIN_EMAIL was a security vulnerability
            // Super admin status must be set explicitly via database migration or CLI
            // If you need to bootstrap a super admin, use: npx prisma db seed --super-admin
            if (isSuperAdmin && !existingUser.isSuperAdmin) {
              logger.warn({
                userId: existingUser.id,
                email: normalizedEmail,
                event: 'SUPER_ADMIN_ATTEMPT_BLOCKED',
              }, 'Blocked auto-promotion to super admin - must be set explicitly in database');
            }
          }
        }

        // For credentials login with TeamMember, auth restrictions already checked in authorize()
        // Just validate the user object is valid
        if (account?.provider === 'credentials' && user.email) {
          // TeamMember login already validated in credentials provider
          // Nothing more to check here
        }

        return true;
      } catch (error) {
        console.error('[Auth] Error in signIn callback:', error);
        return false;
      }
    },

    async jwt({ token, user, trigger, session: _session }) {
      try {
        // SECURITY: Check if password was changed after token was issued
        // This invalidates all existing sessions when password is reset
        // SEC-CRIT-2: Reduced to 30 seconds for tighter permission revocation window
        const SECURITY_CHECK_INTERVAL_MS = 30 * 1000; // 30 seconds (reduced from 2 min for security)
        const now = Date.now();
        const lastSecurityCheck = (token.lastSecurityCheck as number) || 0;
        const shouldCheckSecurity = !user && token.id && token.iat && (now - lastSecurityCheck > SECURITY_CHECK_INTERVAL_MS);

        if (shouldCheckSecurity) {
          // Always check User table for password security (single source of truth)
          // Use userId for TeamMember logins, id for super admin logins
          const authUserId = token.isTeamMember ? (token.userId as string) : (token.id as string);

          if (authUserId) {
            const userSecurityCheck = await prisma.user.findUnique({
              where: { id: authUserId },
              select: { passwordChangedAt: true, isDeleted: true },
            });

            if (userSecurityCheck) {
              // If user is deleted, invalidate the session
              if (userSecurityCheck.isDeleted) {
                return { ...token, id: undefined };
              }

              // If password was changed after token was issued, invalidate the session
              if (userSecurityCheck.passwordChangedAt) {
                const tokenIssuedAt = (token.iat as number) * 1000;
                if (userSecurityCheck.passwordChangedAt.getTime() > tokenIssuedAt) {
                  return { ...token, id: undefined };
                }
              }
            }
          }

          // For TeamMember logins, also check org-level permissions
          if (token.isTeamMember) {
            const memberCheck = await prisma.teamMember.findUnique({
              where: { id: token.id as string },
              select: {
                canLogin: true,
                isDeleted: true,
                // SEC-CRIT-2: Also verify permission flags haven't changed
                isAdmin: true,
                isOwner: true,
                hasFinanceAccess: true,
                hasHRAccess: true,
                hasOperationsAccess: true,
                canApprove: true,
                permissionsUpdatedAt: true,
                isEmployee: true,
                onboardingComplete: true,
              },
            });

            if (memberCheck) {
              // If member can't login or is deleted, invalidate the session
              if (!memberCheck.canLogin || memberCheck.isDeleted) {
                return { ...token, id: undefined };
              }

              // SEC-CRIT-2: Update permission flags from database (ensures revoked permissions take effect)
              token.isAdmin = memberCheck.isAdmin;
              token.isOwner = memberCheck.isOwner;
              token.hasFinanceAccess = memberCheck.hasFinanceAccess;
              token.hasHRAccess = memberCheck.hasHRAccess;
              token.hasOperationsAccess = memberCheck.hasOperationsAccess;
              token.canApprove = memberCheck.canApprove;
              token.isEmployee = memberCheck.isEmployee;
              token.onboardingComplete = memberCheck.onboardingComplete ?? false;
              token.permissionsUpdatedAt = memberCheck.permissionsUpdatedAt?.toISOString() || null;
            }
          }
          // Update last security check timestamp
          token.lastSecurityCheck = now;
        }

        // Initial sign in
        if (user) {
          token.id = user.id;
          token.email = user.email;
          token.name = user.name;

          // Check if this is a TeamMember login (from credentials provider)
          const isTeamMemberLogin = 'isTeamMember' in user && user.isTeamMember === true;

          if (isTeamMemberLogin) {
            // TeamMember login - all data embedded from credentials provider
            token.isTeamMember = true;
            token.isSuperAdmin = false;
            const userData = user as unknown as Record<string, unknown>;
            // Store User ID for auth operations (password security checks)
            token.userId = userData.userId as string;
            token.isOwner = userData.isOwner as boolean;
            token.isEmployee = userData.isEmployee as boolean;
            token.onboardingComplete = (userData.onboardingComplete as boolean) ?? false;
            // Permission flags (new boolean-based system)
            token.isAdmin = userData.isAdmin as boolean;
            token.hasOperationsAccess = userData.hasOperationsAccess as boolean;
            token.hasHRAccess = userData.hasHRAccess as boolean;
            token.hasFinanceAccess = userData.hasFinanceAccess as boolean;
            token.canApprove = userData.canApprove as boolean;
            // Organization context
            token.organizationId = userData.organizationId as string;
            token.organizationSlug = userData.organizationSlug as string;
            token.organizationName = userData.organizationName as string;
            token.organizationLogoUrl = userData.organizationLogoUrl as string | null;
            token.organizationLogoUrlInverse = userData.organizationLogoUrlInverse as string | null;
            token.subscriptionTier = userData.subscriptionTier as SubscriptionTier;
            token.enabledModules = userData.enabledModules as string[];
          } else {
            // Super admin or OAuth login
            token.isTeamMember = false;

            // Get super admin status from database
            const dbUser = await prisma.user.findUnique({
              where: { email: user.email! },
              select: { id: true, isSuperAdmin: true },
            });
            if (dbUser) {
              token.id = dbUser.id;
              token.isSuperAdmin = dbUser.isSuperAdmin;
              // isEmployee is now on TeamMember, not User
              // Super admins are not employees (they're platform admins)
              token.isEmployee = false;
              token.onboardingComplete = true; // Super admins don't need onboarding
            } else {
              token.isSuperAdmin = false;
              token.isEmployee = true;
              token.onboardingComplete = false; // New users need onboarding
            }

            // For non-super-admins, check if they have an org via TeamMember
            if (!token.isSuperAdmin && token.id) {
              // Check TeamMember table for OAuth users using userId FK
              const teamMember = await prisma.teamMember.findFirst({
                where: { userId: token.id as string, isDeleted: false },
                orderBy: { joinedAt: 'asc' },
                select: {
                  id: true,
                  isOwner: true,
                  isEmployee: true,
                  onboardingComplete: true,
                  isAdmin: true,
                  hasOperationsAccess: true,
                  hasHRAccess: true,
                  hasFinanceAccess: true,
                  canApprove: true,
                  permissionsUpdatedAt: true,
                  tenant: {
                    select: {
                      id: true,
                      name: true,
                      slug: true,
                      logoUrl: true,
                      logoUrlInverse: true,
                      subscriptionTier: true,
                      enabledModules: true,
                    },
                  },
                },
              });

              if (teamMember) {
                // Store User ID for auth operations
                token.userId = token.id as string;
                // Switch to TeamMember context
                token.id = teamMember.id;
                token.isTeamMember = true;
                token.isOwner = teamMember.isOwner;
                token.isEmployee = teamMember.isEmployee;
                token.onboardingComplete = teamMember.onboardingComplete ?? false;
                // Permission flags
                token.isAdmin = teamMember.isAdmin;
                token.hasOperationsAccess = teamMember.hasOperationsAccess;
                token.hasHRAccess = teamMember.hasHRAccess;
                token.hasFinanceAccess = teamMember.hasFinanceAccess;
                token.canApprove = teamMember.canApprove;
                token.permissionsUpdatedAt = teamMember.permissionsUpdatedAt?.toISOString() || null;
                // Organization context
                token.organizationId = teamMember.tenant.id;
                token.organizationSlug = teamMember.tenant.slug;
                token.organizationName = teamMember.tenant.name;
                token.organizationLogoUrl = teamMember.tenant.logoUrl;
                token.organizationLogoUrlInverse = teamMember.tenant.logoUrlInverse;
                token.subscriptionTier = teamMember.tenant.subscriptionTier;
                token.enabledModules = teamMember.tenant.enabledModules;
              }
            }

            // Clear org data for super admins (they access via /super-admin)
            if (token.isSuperAdmin && !token.organizationId) {
              token.organizationId = undefined;
              token.organizationSlug = undefined;
              token.organizationName = undefined;
              token.organizationLogoUrl = undefined;
              token.organizationLogoUrlInverse = undefined;
              token.subscriptionTier = undefined;
              token.enabledModules = undefined;
            }
          }
        }

        // Handle session update (e.g., after settings change)
        if (trigger === 'update' && token.id && token.isTeamMember) {
          // Refresh TeamMember data
          const memberData = await getTeamMemberOrganization(token.id as string);
          if (memberData) {
            token.organizationId = memberData.organization.id;
            token.organizationSlug = memberData.organization.slug;
            token.organizationName = memberData.organization.name;
            token.organizationLogoUrl = memberData.organization.logoUrl;
            token.organizationLogoUrlInverse = memberData.organization.logoUrlInverse;
            token.subscriptionTier = memberData.organization.tier;
            token.enabledModules = memberData.organization.enabledModules;
            token.isOwner = memberData.isOwner;
            token.isEmployee = memberData.isEmployee;
            token.onboardingComplete = memberData.onboardingComplete;
            // Permission flags
            token.isAdmin = memberData.isAdmin;
            token.hasOperationsAccess = memberData.hasOperationsAccess;
            token.hasHRAccess = memberData.hasHRAccess;
            token.hasFinanceAccess = memberData.hasFinanceAccess;
            token.canApprove = memberData.canApprove;
            token.permissionsUpdatedAt = memberData.permissionsUpdatedAt;
          }
        }

        return token;
      } catch (error) {
        console.error('[Auth] Error in jwt callback:', error);
        return token;
      }
    },

    async session({ session, token }) {
      try {
        if (token) {
          session.user.id = token.id as string;
          session.user.email = token.email as string;
          session.user.name = token.name as string;
          session.user.isSuperAdmin = token.isSuperAdmin as boolean || false;
          session.user.isEmployee = token.isEmployee as boolean ?? true;
          session.user.onboardingComplete = token.onboardingComplete as boolean ?? false;

          // TeamMember-specific fields
          session.user.isTeamMember = token.isTeamMember as boolean ?? false;
          if (token.isTeamMember) {
            session.user.isOwner = token.isOwner as boolean ?? false;
            // Permission flags (new boolean-based system)
            session.user.isAdmin = token.isAdmin as boolean ?? false;
            session.user.hasOperationsAccess = token.hasOperationsAccess as boolean ?? false;
            session.user.hasHRAccess = token.hasHRAccess as boolean ?? false;
            session.user.hasFinanceAccess = token.hasFinanceAccess as boolean ?? false;
            session.user.canApprove = token.canApprove as boolean ?? false;
            session.user.permissionsUpdatedAt = token.permissionsUpdatedAt as string | undefined;
          }

          // Organization info
          if (token.organizationId) {
            session.user.organizationId = token.organizationId as string;
            session.user.organizationSlug = token.organizationSlug as string;
            session.user.organizationName = token.organizationName as string;
            session.user.organizationLogoUrl = token.organizationLogoUrl as string | undefined;
            session.user.organizationLogoUrlInverse = token.organizationLogoUrlInverse as string | undefined;
            session.user.subscriptionTier = token.subscriptionTier as SubscriptionTier;
            session.user.enabledModules = token.enabledModules as string[] | undefined;
          }
        }

        return session;
      } catch (error) {
        console.error('[Auth] Error in session callback:', error);
        return session;
      }
    },

    async redirect({ url, baseUrl }) {
      // After sign in, redirect to onboarding if no organization
      if (url === baseUrl || url === `${baseUrl}/`) {
        return `${baseUrl}/`;
      }
      // Allow relative URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      // Allow same origin
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },

  pages: {
    signIn: '/login',
    // newUser not needed - middleware handles redirects based on org membership
  },

  session: {
    strategy: 'jwt',
    // SEC-HIGH-5: Reduced from 7 days to 1 day for tighter security
    // Combined with 30-second permission refresh, this limits exposure window
    maxAge: 24 * 60 * 60, // 1 day
  },

  // Share cookies across subdomains for multi-tenant support
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production'
        ? '__Secure-next-auth.session-token'
        : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        // Set domain to root domain to share across subdomains
        domain: process.env.NEXTAUTH_COOKIE_DOMAIN || undefined,
      },
    },
    callbackUrl: {
      name: process.env.NODE_ENV === 'production'
        ? '__Secure-next-auth.callback-url'
        : 'next-auth.callback-url',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        domain: process.env.NEXTAUTH_COOKIE_DOMAIN || undefined,
      },
    },
    csrfToken: {
      name: process.env.NODE_ENV === 'production'
        ? '__Host-next-auth.csrf-token'
        : 'next-auth.csrf-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        // CSRF token uses __Host- prefix which doesn't allow domain
      },
    },
  },

  debug: process.env.NODE_ENV === 'development',
};

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE DECLARATIONS
// ═══════════════════════════════════════════════════════════════════════════════

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      isSuperAdmin: boolean;
      isEmployee: boolean; // false = system/service account
      onboardingComplete: boolean; // true = completed HR profile onboarding
      // TeamMember-specific fields
      isTeamMember: boolean; // true = org user (TeamMember), false = super admin (User)
      isOwner?: boolean; // Organization owner flag (when isTeamMember=true)
      // Permission flags (new boolean-based system - when isTeamMember=true)
      isAdmin?: boolean; // Full access to everything
      hasOperationsAccess?: boolean; // Assets, Subscriptions, Suppliers
      hasHRAccess?: boolean; // Employees, Leave modules
      hasFinanceAccess?: boolean; // Payroll, Purchase Requests
      canApprove?: boolean; // Approve direct reports + scoped read
      permissionsUpdatedAt?: string; // ISO timestamp of last permission change (for session refresh)
      // Organization context
      organizationId?: string;
      organizationSlug?: string;
      organizationName?: string;
      organizationLogoUrl?: string;
      organizationLogoUrlInverse?: string;
      subscriptionTier?: SubscriptionTier;
      enabledModules?: string[];
    };
  }

  interface User {
    // Extended fields from credentials provider
    userId?: string; // User.id for auth operations (when isTeamMember=true, id is TeamMember.id)
    isTeamMember?: boolean;
    isSuperAdmin?: boolean;
    isOwner?: boolean;
    isEmployee?: boolean;
    onboardingComplete?: boolean;
    // Permission flags (new boolean-based system)
    isAdmin?: boolean;
    hasOperationsAccess?: boolean;
    hasHRAccess?: boolean;
    hasFinanceAccess?: boolean;
    canApprove?: boolean;
    // Organization context
    organizationId?: string;
    organizationSlug?: string;
    organizationName?: string;
    organizationLogoUrl?: string | null;
    organizationLogoUrlInverse?: string | null;
    subscriptionTier?: SubscriptionTier;
    enabledModules?: string[];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    userId?: string; // User.id for auth operations (password security, lockout)
    isSuperAdmin?: boolean;
    isEmployee?: boolean;
    onboardingComplete?: boolean;
    // TeamMember-specific fields
    isTeamMember?: boolean;
    isOwner?: boolean;
    // Permission flags (new boolean-based system)
    isAdmin?: boolean;
    hasOperationsAccess?: boolean;
    hasHRAccess?: boolean;
    hasFinanceAccess?: boolean;
    canApprove?: boolean;
    permissionsUpdatedAt?: string | null;
    // Organization context
    organizationId?: string;
    organizationSlug?: string;
    organizationName?: string;
    organizationLogoUrl?: string | null;
    organizationLogoUrlInverse?: string | null;
    subscriptionTier?: SubscriptionTier;
    enabledModules?: string[];
  }
}
