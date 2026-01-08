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
import { Role, OrgRole, SubscriptionTier, TeamMemberRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import {
  isAccountLocked,
  recordFailedLogin,
  clearFailedLogins,
  isTeamMemberLocked,
  recordTeamMemberFailedLogin,
  clearTeamMemberFailedLogins,
} from '@/lib/security/account-lockout';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface OrganizationInfo {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  logoUrlInverse: string | null;
  role: OrgRole;
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

// Microsoft/Azure AD (for enterprise customers - any tenant)
if (process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET) {
  providers.push(
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
      tenantId: process.env.AZURE_AD_TENANT_ID || 'common', // 'common' allows any Microsoft account
      authorization: {
        params: {
          prompt: 'select_account',
        },
      },
    })
  );
}

// Email/Password credentials (for users who signed up with email)
// This provider checks TeamMember first (org users), then User (super admins)
providers.push(
  CredentialsProvider({
    id: 'credentials',
    name: 'Email',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        return null;
      }

      const email = credentials.email.toLowerCase().trim();

      // STEP 1: Try to find TeamMember first (org-level users)
      const teamMember = await prisma.teamMember.findFirst({
        where: { email },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          approvalRole: true,
          passwordHash: true,
          canLogin: true,
          isDeleted: true,
          lockedUntil: true,
          isOwner: true,
          isEmployee: true,
          tenantId: true,
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

      if (teamMember && teamMember.passwordHash) {
        // SECURITY: Check if account is locked (brute-force protection)
        const lockStatus = await isTeamMemberLocked(teamMember.id);
        if (lockStatus.locked) {
          const minutesRemaining = lockStatus.lockedUntil
            ? Math.ceil((lockStatus.lockedUntil.getTime() - Date.now()) / 60000)
            : 5;
          throw new Error(`Account temporarily locked. Try again in ${minutesRemaining} minutes.`);
        }

        // Block soft-deleted members
        if (teamMember.isDeleted) {
          throw new Error('This account has been deactivated');
        }

        // Block members who cannot login
        if (!teamMember.canLogin) {
          throw new Error('This account is not enabled for login');
        }

        // Verify password
        const isValid = await bcrypt.compare(credentials.password, teamMember.passwordHash);
        if (!isValid) {
          // SECURITY: Record failed login attempt
          const lockResult = await recordTeamMemberFailedLogin(teamMember.id);
          if (lockResult.locked) {
            const minutesRemaining = lockResult.lockedUntil
              ? Math.ceil((lockResult.lockedUntil.getTime() - Date.now()) / 60000)
              : 5;
            throw new Error(`Too many failed attempts. Account locked for ${minutesRemaining} minutes.`);
          }
          return null;
        }

        // SECURITY: Clear failed login attempts on successful login
        await clearTeamMemberFailedLogins(teamMember.id);

        // Return TeamMember data with org info embedded
        return {
          id: teamMember.id,
          email: teamMember.email,
          name: teamMember.name,
          role: teamMember.approvalRole, // Legacy role for compatibility
          // Custom fields for TeamMember auth
          isTeamMember: true,
          teamMemberRole: teamMember.role,
          isOwner: teamMember.isOwner,
          isEmployee: teamMember.isEmployee,
          organizationId: teamMember.tenant.id,
          organizationSlug: teamMember.tenant.slug,
          organizationName: teamMember.tenant.name,
          organizationLogoUrl: teamMember.tenant.logoUrl,
          organizationLogoUrlInverse: teamMember.tenant.logoUrlInverse,
          subscriptionTier: teamMember.tenant.subscriptionTier,
          enabledModules: teamMember.tenant.enabledModules,
        };
      }

      // STEP 2: Fall back to User table (for super admins only)
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          passwordHash: true,
          isDeleted: true,
          lockedUntil: true,
          isSuperAdmin: true,
        },
      });

      if (!user || !user.passwordHash) {
        return null;
      }

      // Only allow super admins to login via User table
      if (!user.isSuperAdmin) {
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

      // Block soft-deleted users (deactivated accounts)
      if (user.isDeleted) {
        throw new Error('This account has been deactivated');
      }

      // Super admins can always login (canLogin is only on TeamMember)

      // Verify password
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

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isSuperAdmin: true,
        isTeamMember: false,
      };
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
            role: true,
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
          role: user.role,
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
  teamMemberRole: TeamMemberRole;
  isOwner: boolean;
  isEmployee: boolean;
} | null> {
  const member = await prisma.teamMember.findUnique({
    where: { id: memberId },
    select: {
      role: true,
      approvalRole: true,
      isOwner: true,
      isEmployee: true,
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

  // Map TeamMemberRole to legacy OrgRole for backwards compatibility
  const orgRole = member.isOwner
    ? OrgRole.OWNER
    : member.role === TeamMemberRole.ADMIN
      ? OrgRole.ADMIN
      : OrgRole.MEMBER;

  return {
    organization: {
      id: member.tenant.id,
      name: member.tenant.name,
      slug: member.tenant.slug,
      logoUrl: member.tenant.logoUrl,
      logoUrlInverse: member.tenant.logoUrlInverse,
      role: orgRole,
      tier: member.tenant.subscriptionTier,
      enabledModules: member.tenant.enabledModules,
    },
    teamMemberRole: member.role,
    isOwner: member.isOwner,
    isEmployee: member.isEmployee,
  };
}

/**
 * Get the user's primary organization membership (legacy - for super admin OAuth)
 * Now uses TeamMember table instead of deprecated OrganizationUser
 */
async function getUserOrganization(userId: string): Promise<OrganizationInfo | null> {
  // Find TeamMember by matching User email
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (!user?.email) return null;

  const membership = await prisma.teamMember.findFirst({
    where: { email: user.email, isDeleted: false },
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
    role: membership.isOwner ? OrgRole.OWNER : membership.role === 'ADMIN' ? OrgRole.ADMIN : OrgRole.MEMBER,
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

        // For OAuth providers, check TeamMember and org restrictions
        if (account?.provider && account.provider !== 'credentials' && account.provider !== 'super-admin-credentials' && user.email) {
          const normalizedEmail = user.email.toLowerCase().trim();
          const emailDomain = normalizedEmail.split('@')[1];
          const superAdminEmail = process.env.SUPER_ADMIN_EMAIL?.toLowerCase().trim();
          const isSuperAdmin = superAdminEmail === normalizedEmail;

          // Check TeamMember first (org users)
          const teamMember = await prisma.teamMember.findFirst({
            where: { email: normalizedEmail },
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
            // Block soft-deleted members
            if (teamMember.isDeleted) {
              return '/login?error=AccountDeactivated';
            }

            // Block members who cannot login
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

          // Also check User table for super admins (for OAuth account linking)
          const existingUser = await prisma.user.findUnique({
            where: { email: normalizedEmail },
            include: { accounts: true },
          });

          if (existingUser) {
            // Block soft-deleted users
            if (existingUser.isDeleted) {
              return '/login?error=AccountDeactivated';
            }

            // Note: canLogin is now on TeamMember, not User
            // User table is only for super admins who can always login if not deleted

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

            // Auto-promote to super admin if matching email
            if (isSuperAdmin && !existingUser.isSuperAdmin) {
              await prisma.user.update({
                where: { id: existingUser.id },
                data: { isSuperAdmin: true },
              });
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

    async jwt({ token, user, trigger, session }) {
      try {
        // SECURITY: Check if password was changed after token was issued
        // This invalidates all existing sessions when password is reset
        // OPTIMIZATION: Only check every 5 minutes to reduce database queries and prevent connection pool exhaustion
        const SECURITY_CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
        const now = Date.now();
        const lastSecurityCheck = (token.lastSecurityCheck as number) || 0;
        const shouldCheckSecurity = !user && token.id && token.iat && (now - lastSecurityCheck > SECURITY_CHECK_INTERVAL_MS);

        if (shouldCheckSecurity) {
          // Check against TeamMember table for org users, User table for super admins
          if (token.isTeamMember) {
            const securityCheck = await prisma.teamMember.findUnique({
              where: { id: token.id as string },
              select: { passwordChangedAt: true, canLogin: true, isDeleted: true },
            });

            if (securityCheck) {
              // If member can't login or is deleted, invalidate the session
              if (!securityCheck.canLogin || securityCheck.isDeleted) {
                return { ...token, id: undefined };
              }

              // If password was changed after token was issued, invalidate the session
              if (securityCheck.passwordChangedAt) {
                const tokenIssuedAt = (token.iat as number) * 1000;
                if (securityCheck.passwordChangedAt.getTime() > tokenIssuedAt) {
                  return { ...token, id: undefined };
                }
              }
            }
          } else {
            // Super admin - check User table
            const securityCheck = await prisma.user.findUnique({
              where: { id: token.id as string },
              select: { passwordChangedAt: true, isDeleted: true },
            });

            if (securityCheck) {
              // Super admins can always login if not deleted (canLogin is only on TeamMember)
              if (securityCheck.isDeleted) {
                return { ...token, id: undefined };
              }

              if (securityCheck.passwordChangedAt) {
                const tokenIssuedAt = (token.iat as number) * 1000;
                if (securityCheck.passwordChangedAt.getTime() > tokenIssuedAt) {
                  return { ...token, id: undefined };
                }
              }
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
            token.role = userData.role as Role;
            token.teamMemberRole = userData.teamMemberRole as TeamMemberRole;
            token.isOwner = userData.isOwner as boolean;
            token.isEmployee = userData.isEmployee as boolean;
            token.organizationId = userData.organizationId as string;
            token.organizationSlug = userData.organizationSlug as string;
            token.organizationName = userData.organizationName as string;
            token.organizationLogoUrl = userData.organizationLogoUrl as string | null;
            token.organizationLogoUrlInverse = userData.organizationLogoUrlInverse as string | null;
            token.subscriptionTier = userData.subscriptionTier as SubscriptionTier;
            token.enabledModules = userData.enabledModules as string[];
            // Map TeamMemberRole to legacy OrgRole - owners get OWNER role
            token.orgRole = token.isOwner
              ? OrgRole.OWNER
              : token.teamMemberRole === TeamMemberRole.ADMIN
                ? OrgRole.ADMIN
                : OrgRole.MEMBER;
          } else {
            // Super admin or OAuth login
            token.isTeamMember = false;

            // Get role and super admin status from database
            const dbUser = await prisma.user.findUnique({
              where: { email: user.email! },
              select: { id: true, role: true, isSuperAdmin: true },
            });
            if (dbUser) {
              token.id = dbUser.id;
              token.role = dbUser.role;
              token.isSuperAdmin = dbUser.isSuperAdmin;
              // isEmployee is now on TeamMember, not User
              // Super admins are not employees (they're platform admins)
              token.isEmployee = false;
            } else if ('role' in user && user.role) {
              token.role = user.role;
              token.isSuperAdmin = false;
              token.isEmployee = true;
            }

            // For super admins, check if they have an org via legacy path
            if (!token.isSuperAdmin) {
              // Check TeamMember table first for OAuth users
              const teamMember = await prisma.teamMember.findFirst({
                where: { email: user.email!.toLowerCase().trim() },
                select: {
                  id: true,
                  role: true,
                  isOwner: true,
                  isEmployee: true,
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
                // Switch to TeamMember context
                token.id = teamMember.id;
                token.isTeamMember = true;
                token.teamMemberRole = teamMember.role;
                token.isOwner = teamMember.isOwner;
                token.isEmployee = teamMember.isEmployee;
                token.organizationId = teamMember.tenant.id;
                token.organizationSlug = teamMember.tenant.slug;
                token.organizationName = teamMember.tenant.name;
                token.organizationLogoUrl = teamMember.tenant.logoUrl;
                token.organizationLogoUrlInverse = teamMember.tenant.logoUrlInverse;
                token.subscriptionTier = teamMember.tenant.subscriptionTier;
                token.enabledModules = teamMember.tenant.enabledModules;
                // Owners get OWNER role, otherwise map from teamMemberRole
                token.orgRole = teamMember.isOwner
                  ? OrgRole.OWNER
                  : teamMember.role === TeamMemberRole.ADMIN
                    ? OrgRole.ADMIN
                    : OrgRole.MEMBER;
              }
            }

            // Clear org data for super admins (they access via /super-admin)
            if (token.isSuperAdmin && !token.organizationId) {
              token.organizationId = undefined;
              token.organizationSlug = undefined;
              token.organizationName = undefined;
              token.organizationLogoUrl = undefined;
              token.organizationLogoUrlInverse = undefined;
              token.orgRole = undefined;
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
            token.orgRole = memberData.organization.role;
            token.subscriptionTier = memberData.organization.tier;
            token.enabledModules = memberData.organization.enabledModules;
            token.teamMemberRole = memberData.teamMemberRole;
            token.isOwner = memberData.isOwner;
            token.isEmployee = memberData.isEmployee;
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
          session.user.role = token.role as Role;
          session.user.isSuperAdmin = token.isSuperAdmin as boolean || false;
          session.user.isEmployee = token.isEmployee as boolean ?? true;

          // TeamMember-specific fields
          session.user.isTeamMember = token.isTeamMember as boolean ?? false;
          if (token.isTeamMember) {
            session.user.teamMemberRole = token.teamMemberRole as TeamMemberRole;
            session.user.isOwner = token.isOwner as boolean ?? false;
          }

          // Organization info
          if (token.organizationId) {
            session.user.organizationId = token.organizationId as string;
            session.user.organizationSlug = token.organizationSlug as string;
            session.user.organizationName = token.organizationName as string;
            session.user.organizationLogoUrl = token.organizationLogoUrl as string | undefined;
            session.user.organizationLogoUrlInverse = token.organizationLogoUrlInverse as string | undefined;
            session.user.orgRole = token.orgRole as OrgRole;
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
    // SEC-006: Reduced from 30 to 14 days for security
    maxAge: 14 * 24 * 60 * 60, // 14 days
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
      role: Role;
      isSuperAdmin: boolean;
      isEmployee: boolean; // false = system/service account
      // TeamMember-specific fields
      isTeamMember: boolean; // true = org user (TeamMember), false = super admin (User)
      teamMemberRole?: TeamMemberRole; // ADMIN | MEMBER (when isTeamMember=true)
      isOwner?: boolean; // Organization owner flag (when isTeamMember=true)
      // Organization context
      organizationId?: string;
      organizationSlug?: string;
      organizationName?: string;
      organizationLogoUrl?: string;
      organizationLogoUrlInverse?: string;
      orgRole?: OrgRole; // Legacy role for backwards compatibility
      subscriptionTier?: SubscriptionTier;
      enabledModules?: string[];
    };
  }

  interface User {
    role?: Role;
    // Extended fields from credentials provider
    isTeamMember?: boolean;
    teamMemberRole?: TeamMemberRole;
    isOwner?: boolean;
    isEmployee?: boolean;
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
    role?: Role;
    isSuperAdmin?: boolean;
    isEmployee?: boolean;
    // TeamMember-specific fields
    isTeamMember?: boolean;
    teamMemberRole?: TeamMemberRole;
    isOwner?: boolean;
    // Organization context
    organizationId?: string;
    organizationSlug?: string;
    organizationName?: string;
    organizationLogoUrl?: string | null;
    organizationLogoUrlInverse?: string | null;
    orgRole?: OrgRole;
    subscriptionTier?: SubscriptionTier;
    enabledModules?: string[];
  }
}
