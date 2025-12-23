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
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEV USERS (for development only)
// ═══════════════════════════════════════════════════════════════════════════════

const DEV_USERS: Record<string, { id: string; email: string; name: string; role: Role; password: string }> = {
  'admin@test.local': {
    id: 'dev-admin-001',
    email: 'admin@test.local',
    name: 'Dev Admin',
    role: Role.ADMIN,
    password: 'admin123',
  },
  'employee@test.local': {
    id: 'dev-employee-001',
    email: 'employee@test.local',
    name: 'Dev Employee',
    role: Role.EMPLOYEE,
    password: 'employee123',
  },
};

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

      // Check for dev users first (development only)
      if (process.env.DEV_AUTH_ENABLED === 'true') {
        const devUser = DEV_USERS[email];
        if (devUser && devUser.password === credentials.password) {
          // Ensure dev user exists in database
          const dbUser = await prisma.user.upsert({
            where: { email: devUser.email },
            update: { name: devUser.name, role: devUser.role },
            create: {
              id: devUser.id,
              email: devUser.email,
              name: devUser.name,
              role: devUser.role,
            },
          });

          return {
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name,
            role: dbUser.role,
          };
        }
      }

      // Look up user in database
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          passwordHash: true,
        },
      });

      if (!user || !user.passwordHash) {
        return null;
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
        // For OAuth providers, link accounts with same email if exists
        if (account?.provider && account.provider !== 'credentials' && user.email) {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email },
            include: { accounts: true },
          });

          if (existingUser) {
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
          }
        }

        // Handle session update (e.g., after org switch)
        if (trigger === 'update' && session) {
          if (session.organizationId) {
            const membership = await prisma.organizationUser.findUnique({
              where: {
                organizationId_userId: {
                  organizationId: session.organizationId,
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
            }
          }
        }

        // Refresh organization info if missing
        if (token.id && !token.organizationId) {
          const org = await getUserOrganization(token.id as string);
          if (org) {
            token.organizationId = org.id;
            token.organizationSlug = org.slug;
            token.organizationName = org.name;
            token.organizationLogoUrl = org.logoUrl;
            token.orgRole = org.role;
            token.subscriptionTier = org.tier;
          }
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
  }
}
