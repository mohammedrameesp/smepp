import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import AzureADProvider from 'next-auth/providers/azure-ad';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from './prisma';
import { Role, OrgRole, SubscriptionTier } from '@prisma/client';
import bcrypt from 'bcryptjs';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface OrganizationInfo {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
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

      // Look up user in database
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          passwordHash: true,
          canLogin: true,
        },
      });

      if (!user || !user.passwordHash) {
        return null;
      }

      // Block users who cannot login (non-login employees like drivers)
      if (!user.canLogin) {
        throw new Error('This account is not enabled for login');
      }

      // Verify password
      const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
      if (!isValid) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
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
 * Get the user's primary organization membership
 */
async function getUserOrganization(userId: string): Promise<OrganizationInfo | null> {
  const membership = await prisma.organizationUser.findFirst({
    where: { userId },
    orderBy: { joinedAt: 'asc' }, // Get the oldest (first) organization
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
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
    id: membership.organization.id,
    name: membership.organization.name,
    slug: membership.organization.slug,
    logoUrl: membership.organization.logoUrl,
    role: membership.role,
    tier: membership.organization.subscriptionTier,
    enabledModules: membership.organization.enabledModules,
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
          'super-admin-credentials': 'credentials', // Allow super admins through
        };

        const authMethod = account?.provider ? providerToAuthMethod[account.provider] : null;

        // For OAuth providers, link accounts with same email if exists
        if (account?.provider && account.provider !== 'credentials' && account.provider !== 'super-admin-credentials' && user.email) {
          const normalizedEmail = user.email.toLowerCase().trim();
          const emailDomain = normalizedEmail.split('@')[1];
          const superAdminEmail = process.env.SUPER_ADMIN_EMAIL?.toLowerCase().trim();
          const isSuperAdmin = superAdminEmail === normalizedEmail;

          const existingUser = await prisma.user.findUnique({
            where: { email: normalizedEmail },
            include: { accounts: true },
          });

          // Block users who cannot login (non-login employees like drivers)
          if (existingUser && !existingUser.canLogin) {
            console.log(`Login blocked for non-login user: ${normalizedEmail}`);
            return false;
          }

          // Check auth restrictions for existing users with organizations
          if (existingUser) {
            // Get user's organizations with auth config
            const memberships = await prisma.organizationUser.findMany({
              where: { userId: existingUser.id },
              include: {
                organization: {
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

            // Check if ALL user's organizations allow this auth method
            // (If user belongs to orgs with restrictions, validate against them)
            for (const membership of memberships) {
              const org = membership.organization;

              // Skip super admins - they can always login
              if (isSuperAdmin) continue;

              // Check auth method restriction
              if (org.allowedAuthMethods.length > 0 && authMethod) {
                if (!org.allowedAuthMethods.includes(authMethod)) {
                  console.log(`Auth method ${authMethod} not allowed for org ${org.name}`);
                  return '/login?error=AuthMethodNotAllowed';
                }
              }

              // Check email domain restriction
              if (org.enforceDomainRestriction && org.allowedEmailDomains.length > 0) {
                if (!org.allowedEmailDomains.includes(emailDomain)) {
                  console.log(`Email domain ${emailDomain} not allowed for org ${org.name}`);
                  return '/login?error=DomainNotAllowed';
                }
              }
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

            // Auto-promote to super admin if matching email
            if (isSuperAdmin && !existingUser.isSuperAdmin) {
              await prisma.user.update({
                where: { id: existingUser.id },
                data: { isSuperAdmin: true },
              });
            }
          }
        }

        // For credentials login, also check auth restrictions
        if (account?.provider === 'credentials' && user.email) {
          const normalizedEmail = user.email.toLowerCase().trim();
          const emailDomain = normalizedEmail.split('@')[1];

          // Get user from DB to check org memberships
          const dbUser = await prisma.user.findUnique({
            where: { email: normalizedEmail },
            select: { id: true, isSuperAdmin: true },
          });

          if (dbUser && !dbUser.isSuperAdmin) {
            const memberships = await prisma.organizationUser.findMany({
              where: { userId: dbUser.id },
              include: {
                organization: {
                  select: {
                    name: true,
                    allowedAuthMethods: true,
                    allowedEmailDomains: true,
                    enforceDomainRestriction: true,
                  },
                },
              },
            });

            for (const membership of memberships) {
              const org = membership.organization;

              // Check auth method restriction
              if (org.allowedAuthMethods.length > 0) {
                if (!org.allowedAuthMethods.includes('credentials')) {
                  console.log(`Credentials auth not allowed for org ${org.name}`);
                  return '/login?error=AuthMethodNotAllowed';
                }
              }

              // Check email domain restriction
              if (org.enforceDomainRestriction && org.allowedEmailDomains.length > 0) {
                if (!org.allowedEmailDomains.includes(emailDomain)) {
                  console.log(`Email domain ${emailDomain} not allowed for org ${org.name}`);
                  return '/login?error=DomainNotAllowed';
                }
              }
            }
          }
        }

        return true;
      } catch (error) {
        console.error('Error in signIn callback:', error);
        return false;
      }
    },

    async jwt({ token, user, trigger, session }) {
      try {
        // Initial sign in
        if (user) {
          token.id = user.id;
          token.email = user.email;
          token.name = user.name;

          // Get role and super admin status from database
          const dbUser = await prisma.user.findUnique({
            where: { email: user.email! },
            select: { id: true, role: true, isSuperAdmin: true },
          });
          if (dbUser) {
            token.id = dbUser.id;
            token.role = dbUser.role;
            token.isSuperAdmin = dbUser.isSuperAdmin;
          } else if ('role' in user && user.role) {
            token.role = user.role;
            token.isSuperAdmin = false;
          }

          // Get organization info
          const org = await getUserOrganization(token.id as string);
          if (org) {
            token.organizationId = org.id;
            token.organizationSlug = org.slug;
            token.organizationName = org.name;
            token.organizationLogoUrl = org.logoUrl;
            token.orgRole = org.role;
            token.subscriptionTier = org.tier;
            token.enabledModules = org.enabledModules;
          } else {
            // Clear any stale organization data (e.g., if org was deleted)
            token.organizationId = undefined;
            token.organizationSlug = undefined;
            token.organizationName = undefined;
            token.organizationLogoUrl = undefined;
            token.orgRole = undefined;
            token.subscriptionTier = undefined;
            token.enabledModules = undefined;
          }
        }

        // Handle session update (e.g., after settings change or org switch)
        if (trigger === 'update') {
          // Determine which org to refresh - use passed session.organizationId or existing token.organizationId
          const orgIdToRefresh = session?.organizationId || token.organizationId;

          if (orgIdToRefresh && token.id) {
            const membership = await prisma.organizationUser.findUnique({
              where: {
                organizationId_userId: {
                  organizationId: orgIdToRefresh as string,
                  userId: token.id as string,
                },
              },
              include: {
                organization: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    logoUrl: true,
                    subscriptionTier: true,
                    enabledModules: true,
                  },
                },
              },
            });

            if (membership) {
              token.organizationId = membership.organization.id;
              token.organizationSlug = membership.organization.slug;
              token.organizationName = membership.organization.name;
              token.organizationLogoUrl = membership.organization.logoUrl;
              token.orgRole = membership.role;
              token.subscriptionTier = membership.organization.subscriptionTier;
              token.enabledModules = membership.organization.enabledModules;
            }
          }
        }

        // Refresh organization info if missing (but don't override cleared values)
        if (token.id && token.organizationId === undefined) {
          const org = await getUserOrganization(token.id as string);
          if (org) {
            token.organizationId = org.id;
            token.organizationSlug = org.slug;
            token.organizationName = org.name;
            token.organizationLogoUrl = org.logoUrl;
            token.orgRole = org.role;
            token.subscriptionTier = org.tier;
            token.enabledModules = org.enabledModules;
          }
          // If still no org, values remain undefined (user has no organization)
        }

        return token;
      } catch (error) {
        console.error('Error in jwt callback:', error);
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

          // Organization info
          if (token.organizationId) {
            session.user.organizationId = token.organizationId as string;
            session.user.organizationSlug = token.organizationSlug as string;
            session.user.organizationName = token.organizationName as string;
            session.user.organizationLogoUrl = token.organizationLogoUrl as string | undefined;
            session.user.orgRole = token.orgRole as OrgRole;
            session.user.subscriptionTier = token.subscriptionTier as SubscriptionTier;
            session.user.enabledModules = token.enabledModules as string[] | undefined;
          }
        }

        return session;
      } catch (error) {
        console.error('Error in session callback:', error);
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
    maxAge: 30 * 24 * 60 * 60, // 30 days
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
      // Organization context
      organizationId?: string;
      organizationSlug?: string;
      organizationName?: string;
      organizationLogoUrl?: string;
      orgRole?: OrgRole;
      subscriptionTier?: SubscriptionTier;
      enabledModules?: string[];
    };
  }

  interface User {
    role?: Role;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    role?: Role;
    isSuperAdmin?: boolean;
    organizationId?: string;
    organizationSlug?: string;
    organizationName?: string;
    organizationLogoUrl?: string | null;
    orgRole?: OrgRole;
    subscriptionTier?: SubscriptionTier;
    enabledModules?: string[];
  }
}
