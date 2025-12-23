import { NextAuthOptions } from 'next-auth';
import AzureADProvider from 'next-auth/providers/azure-ad';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from './prisma';
import { Role } from '@prisma/client';

const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(email => email.trim()) || [];

// Development-only test users (only available when DEV_AUTH_ENABLED=true)
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

// Build providers array based on environment
const providers: NextAuthOptions['providers'] = [];

// Always add Azure AD if configured
if (process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET && process.env.AZURE_AD_TENANT_ID) {
  providers.push(
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
      tenantId: process.env.AZURE_AD_TENANT_ID,
      authorization: {
        params: {
          prompt: "select_account",
        }
      }
    })
  );
}

// Add development credentials provider (only when DEV_AUTH_ENABLED=true)
if (process.env.DEV_AUTH_ENABLED === 'true') {
  providers.push(
    CredentialsProvider({
      id: 'dev-credentials',
      name: 'Development Login',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'admin@test.local' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const devUser = DEV_USERS[credentials.email.toLowerCase()];
        if (devUser && devUser.password === credentials.password) {
          // Ensure the dev user exists in the database
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

        return null;
      },
    })
  );
}

export const authOptions: NextAuthOptions = {
  // Note: Using PrismaAdapter for OAuth providers, but JWT strategy for sessions
  // to avoid database session issues
  adapter: PrismaAdapter(prisma),
  providers,
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        // For OAuth providers (Azure AD), automatically link accounts with same email
        if (account?.provider === 'azure-ad' && user.email) {
          // Check if user exists in database
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email },
            include: { accounts: true }
          });

          if (existingUser) {
            // Check if this specific OAuth account is already linked
            const accountExists = existingUser.accounts.some(
              acc => acc.provider === account.provider && acc.providerAccountId === account.providerAccountId
            );

            if (!accountExists) {
              // Link the OAuth account to the existing user
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

        return true; // Allow sign in
      } catch (error) {
        console.error('ERROR in signIn callback:', error);
        // Log the full error details
        if (error instanceof Error) {
          console.error('Error message:', error.message);
          console.error('Error stack:', error.stack);
        }
        return false;
      }
    },
    async jwt({ token, user, account }) {
      try {
        // On sign in (when user object exists)
        if (user) {
          token.email = user.email;
          token.name = user.name;

          // If user already has role (from credentials provider), use it
          if ('role' in user && user.role) {
            token.role = user.role;
            token.id = user.id;
          } else {
            // For OAuth providers, fetch/update user from database
            // PrismaAdapter has already created the user, we just need to get the ID and set role
            const isAdmin = adminEmails.includes(user.email!);
            const targetRole = isAdmin ? Role.ADMIN : Role.EMPLOYEE;

            try {
              // Update user with correct role
              const dbUser = await prisma.user.update({
                where: { email: user.email! },
                data: {
                  name: user.name,
                  image: user.image,
                  role: targetRole,
                },
              });

              token.id = dbUser.id;
              token.role = dbUser.role;
            } catch (error) {
              console.error('Failed to fetch/update OAuth user:', error);
              if (error instanceof Error) {
                console.error('Error message:', error.message);
              }
              // Fallback: try to just find the user
              const dbUser = await prisma.user.findUnique({
                where: { email: user.email! },
              });
              if (dbUser) {
                token.id = dbUser.id;
                token.role = dbUser.role;
              }
            }
          }
        }

        // If role is not in token yet, try to get it from database
        if ((!token.role || !token.id) && token.email) {
          try {
            const dbUser = await prisma.user.findUnique({
              where: { email: token.email as string },
            });

            if (dbUser) {
              token.id = dbUser.id;
              token.role = dbUser.role;
              token.name = dbUser.name;
            }
          } catch (error) {
            console.error('Failed to get user from database:', error);
          }
        }

        return token;
      } catch (error) {
        console.error('ERROR in jwt callback:', error);
        if (error instanceof Error) {
          console.error('Error message:', error.message);
          console.error('Error stack:', error.stack);
        }
        return token;
      }
    },
    async session({ session, token }) {
      try {
        if (token) {
          session.user.id = token.id as string;
          session.user.role = token.role as Role;
          session.user.email = token.email as string;
          session.user.name = token.name as string;
        }

        return session;
      } catch (error) {
        console.error('ERROR in session callback:', error);
        if (error instanceof Error) {
          console.error('Error message:', error.message);
          console.error('Error stack:', error.stack);
        }
        return session;
      }
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  debug: process.env.NODE_ENV === 'development',
};

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: Role;
    };
  }

  interface User {
    role?: Role;
  }
}