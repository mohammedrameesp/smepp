import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import * as jose from 'jose';
import { checkModuleAccess } from '@/lib/modules/routes';

// Impersonation cookie name (must match the one in verify route)
const IMPERSONATION_COOKIE = 'durj-impersonation';

// Cache the encoded JWT secret at module load time to avoid re-encoding on every request
// This saves ~1-2ms per impersonation token verification
let cachedJwtSecret: Uint8Array | null = null;
function getJwtSecret(): Uint8Array | null {
  if (cachedJwtSecret) return cachedJwtSecret;
  if (!process.env.NEXTAUTH_SECRET) return null;
  cachedJwtSecret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
  return cachedJwtSecret;
}

// Interface for impersonation data
interface ImpersonationData {
  jti: string | null; // JWT ID for revocation
  superAdminId: string;
  superAdminEmail: string;
  superAdminName: string | null;
  organizationId: string;
  organizationSlug: string;
  organizationName: string;
  subscriptionTier: string;
  enabledModules: string[];
  startedAt: string;
  expiresAt: string;
}

/**
 * Verify and extract impersonation data from cookie
 * The cookie contains the original impersonation token from the API
 */
async function getImpersonationData(request: NextRequest): Promise<ImpersonationData | null> {
  const cookie = request.cookies.get(IMPERSONATION_COOKIE);
  if (!cookie?.value) return null;

  try {
    const secret = getJwtSecret();
    if (!secret) {
      console.error('CRITICAL: NEXTAUTH_SECRET is not set');
      return null;
    }
    const { payload } = await jose.jwtVerify(cookie.value, secret);

    // Verify the token purpose
    if (payload.purpose !== 'impersonation') {
      return null;
    }

    // Map the API token structure to ImpersonationData
    return {
      jti: (payload.jti as string) || null, // JWT ID for revocation
      superAdminId: payload.superAdminId as string,
      superAdminEmail: payload.superAdminEmail as string,
      superAdminName: (payload.superAdminName as string) || null,
      organizationId: payload.organizationId as string,
      organizationSlug: payload.organizationSlug as string,
      organizationName: payload.organizationName as string,
      subscriptionTier: (payload.subscriptionTier as string) || 'FREE',
      enabledModules: (payload.enabledModules as string[]) || ['assets', 'subscriptions', 'suppliers'],
      startedAt: new Date((payload.iat as number) * 1000).toISOString(),
      expiresAt: new Date((payload.exp as number) * 1000).toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Verify impersonation token from URL query parameter
 * This is used when the super admin first lands on the subdomain
 */
async function verifyImpersonationToken(token: string): Promise<{
  jti: string | null;
  superAdminId: string;
  superAdminEmail: string;
  superAdminName: string | null;
  organizationId: string;
  organizationSlug: string;
  organizationName: string;
  subscriptionTier: string;
  enabledModules: string[];
} | null> {
  try {
    const secret = getJwtSecret();
    if (!secret) {
      console.error('CRITICAL: NEXTAUTH_SECRET is not set');
      return null;
    }
    const { payload } = await jose.jwtVerify(token, secret);

    // Verify the token purpose
    if (payload.purpose !== 'impersonation') {
      return null;
    }

    return {
      jti: (payload.jti as string) || null,
      superAdminId: payload.superAdminId as string,
      superAdminEmail: payload.superAdminEmail as string,
      superAdminName: (payload.superAdminName as string) || null,
      organizationId: payload.organizationId as string,
      organizationSlug: payload.organizationSlug as string,
      organizationName: payload.organizationName as string,
      subscriptionTier: (payload.subscriptionTier as string) || 'FREE',
      enabledModules: (payload.enabledModules as string[]) || ['assets', 'subscriptions', 'suppliers'],
    };
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE ROUTE PROTECTION
// Route-to-module mapping is imported from @/lib/modules/routes
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Multi-Tenant Proxy (Next.js 16+)
 *
 * Handles:
 * 1. Subdomain-based tenant routing (acme.durj.com)
 * 2. Authentication and session validation
 * 3. Smart redirects based on auth/org status
 * 4. Tenant context injection via headers
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost:3000';

// Reserved subdomains that cannot be used by organizations
const RESERVED_SUBDOMAINS = new Set([
  'www', 'app', 'api', 'admin', 'dashboard', 'help', 'support', 'docs',
  'blog', 'status', 'mail', 'cdn', 'assets', 'static', 'media', 'dev',
  'staging', 'test', 'demo', 'beta', 'login', 'signup', 'auth', 'sso',
  'account', 'billing', 'pricing', 'enterprise', 'team', 'org', 'about',
  'contact', 'legal', 'privacy', 'terms', 'platform',
]);

// Routes that don't require authentication (on main domain)
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/set-password', // Initial password setup for new employees
  '/get-started', // Public signup page
  '/suppliers/register', // Public supplier registration form
  '/api/auth',
  '/api/health', // Health check endpoint for monitoring
  '/api/webhooks',
  '/api/public', // Public APIs (tenant branding, etc.)
  '/api/invitations', // Invitation APIs (fetch details before auth)
  '/api/super-admin/auth', // Super admin auth APIs (login, verify-2fa)
  '/api/super-admin/stats', // Platform stats for login page
  '/api/super-admin/import-becreative', // Data import endpoint (temporary)
  '/api/super-admin/set-password', // Password reset endpoint (temporary)
  '/api/organizations/signup', // Public organization signup
  '/api/subdomains', // Subdomain availability check
  '/api/suppliers/register', // Public supplier registration API
  '/api/suppliers/categories', // Public categories for supplier registration autocomplete
  '/verify',
  '/invite',
  '/pricing',
  '/features',
  '/about',
  '/_next',
  '/favicon.ico',
  '/logo.png',
  '/manifest.json',
];

// Routes that require authentication but not organization
const AUTH_ONLY_ROUTES = [
  '/setup', // Org setup for invited admins
  '/pending', // Waiting for invitation
  '/api/organizations',
];

// Super admin routes (require isSuperAdmin flag)
const SUPER_ADMIN_ROUTES = [
  '/super-admin',
];

// ═══════════════════════════════════════════════════════════════════════════════
// SUBDOMAIN EXTRACTION
// ═══════════════════════════════════════════════════════════════════════════════

interface SubdomainInfo {
  subdomain: string | null;
  isMainDomain: boolean;
  isReserved: boolean;
}

function extractSubdomain(host: string): SubdomainInfo {
  const hostWithoutPort = host.split(':')[0];
  const appDomainWithoutPort = APP_DOMAIN.split(':')[0];

  // Check if this is the main domain (including www variant)
  if (
    hostWithoutPort === appDomainWithoutPort ||
    host === APP_DOMAIN ||
    hostWithoutPort === `www.${appDomainWithoutPort}`
  ) {
    return { subdomain: null, isMainDomain: true, isReserved: false };
  }

  // Check if host ends with the app domain (subdomain.domain.com)
  const suffix = `.${appDomainWithoutPort}`;
  if (hostWithoutPort.endsWith(suffix)) {
    const subdomain = hostWithoutPort.slice(0, -suffix.length).split('.')[0];
    return {
      subdomain,
      isMainDomain: false,
      isReserved: RESERVED_SUBDOMAINS.has(subdomain.toLowerCase()),
    };
  }

  // Handle localhost development: acme.localhost
  if (hostWithoutPort.endsWith('.localhost')) {
    const subdomain = hostWithoutPort.replace('.localhost', '');
    return {
      subdomain,
      isMainDomain: false,
      isReserved: RESERVED_SUBDOMAINS.has(subdomain.toLowerCase()),
    };
  }

  // Unknown domain - treat as main domain
  return { subdomain: null, isMainDomain: true, isReserved: false };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════════

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get('host') || APP_DOMAIN;

  // Extract subdomain info
  const { subdomain, isMainDomain, isReserved } = extractSubdomain(host);

  // ─────────────────────────────────────────────────────────────────────────────
  // SUBDOMAIN ROUTING
  // ─────────────────────────────────────────────────────────────────────────────

  if (!isMainDomain && subdomain) {
    // Reserved subdomain - redirect to main domain
    if (isReserved) {
      const mainUrl = new URL(pathname, `${request.nextUrl.protocol}//${APP_DOMAIN}`);
      return NextResponse.redirect(mainUrl);
    }

    // Subdomain request - this is a tenant-specific request
    // Get token to verify user belongs to this tenant
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    // Subdomain root - redirect to /admin or /login
    if (pathname === '/') {
      // Check for impersonation first
      const impersonation = await getImpersonationData(request);
      if (impersonation && impersonation.organizationSlug.toLowerCase() === subdomain.toLowerCase()) {
        return NextResponse.redirect(new URL('/admin', request.url));
      }

      if (token && token.organizationSlug?.toString().toLowerCase() === subdomain.toLowerCase()) {
        return NextResponse.redirect(new URL('/admin', request.url));
      } else {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    }

    // Allow public routes on subdomains (for login redirects) - but not root
    if (PUBLIC_ROUTES.some((route) => route !== '/' && pathname.startsWith(route))) {
      const response = NextResponse.next();
      response.headers.set('x-subdomain', subdomain);
      return response;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // CHECK FOR SUPER ADMIN IMPERSONATION
    // ─────────────────────────────────────────────────────────────────────────────

    // First check for impersonation token in URL (first-time landing)
    const impersonateToken = request.nextUrl.searchParams.get('impersonate');
    if (impersonateToken) {
      const tokenData = await verifyImpersonationToken(impersonateToken);

      // If valid token and matches this subdomain, set cookie and allow access
      if (tokenData && tokenData.organizationSlug.toLowerCase() === subdomain.toLowerCase()) {
        // Allow access with impersonation headers (don't redirect, just continue)
        const response = NextResponse.next();
        response.headers.set('x-subdomain', subdomain);
        response.headers.set('x-tenant-id', tokenData.organizationId);
        response.headers.set('x-tenant-slug', tokenData.organizationSlug);
        response.headers.set('x-user-id', tokenData.superAdminId);
        response.headers.set('x-user-role', 'ADMIN');
        response.headers.set('x-org-role', 'OWNER');
        response.headers.set('x-subscription-tier', tokenData.subscriptionTier);
        response.headers.set('x-impersonating', 'true');
        response.headers.set('x-impersonator-email', tokenData.superAdminEmail);
        if (tokenData.jti) {
          response.headers.set('x-impersonation-jti', tokenData.jti);
        }

        // Store the ORIGINAL token as the cookie (already signed by the API)
        // SECURITY: Short TTL (15 minutes) to limit exposure if token is compromised
        response.cookies.set(IMPERSONATION_COOKIE, impersonateToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict', // Changed from 'lax' for additional CSRF protection
          path: '/',
          maxAge: 15 * 60, // 15 minutes (reduced from 4 hours)
        });

        return response;
      }
    }

    // Then check for existing impersonation cookie
    const impersonation = await getImpersonationData(request);

    // If impersonating and the subdomain matches the impersonated org
    if (impersonation && impersonation.organizationSlug.toLowerCase() === subdomain.toLowerCase()) {
      // Super admin is impersonating this org - allow access with org context
      const enabledModules = impersonation.enabledModules || ['assets', 'subscriptions', 'suppliers'];
      const subscriptionTier = impersonation.subscriptionTier || 'FREE';
      const moduleAccess = checkModuleAccess(pathname, enabledModules);

      if (!moduleAccess.allowed && moduleAccess.moduleId) {
        const modulesUrl = new URL('/admin/modules', request.url);
        modulesUrl.searchParams.set('install', moduleAccess.moduleId);
        modulesUrl.searchParams.set('from', pathname);
        return NextResponse.redirect(modulesUrl);
      }

      // Allow access with impersonation context
      const response = NextResponse.next();
      response.headers.set('x-subdomain', subdomain);
      response.headers.set('x-tenant-id', impersonation.organizationId);
      response.headers.set('x-tenant-slug', impersonation.organizationSlug);
      response.headers.set('x-user-id', impersonation.superAdminId);
      response.headers.set('x-user-role', 'ADMIN'); // Super admin acts as admin when impersonating
      response.headers.set('x-org-role', 'OWNER'); // Full access when impersonating
      response.headers.set('x-subscription-tier', subscriptionTier);
      response.headers.set('x-impersonating', 'true'); // Flag for impersonation
      response.headers.set('x-impersonator-email', impersonation.superAdminEmail);
      if (impersonation.jti) {
        response.headers.set('x-impersonation-jti', impersonation.jti);
      }
      return response;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // NORMAL USER AUTHENTICATION
    // ─────────────────────────────────────────────────────────────────────────────

    // Unauthenticated on subdomain - redirect to subdomain login (not main domain)
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Check if user's org slug matches the subdomain
    const userOrgSlug = token.organizationSlug as string | undefined;

    if (!userOrgSlug) {
      // User has no org - redirect to pending page on main domain
      const pendingUrl = new URL('/pending', `${request.nextUrl.protocol}//${APP_DOMAIN}`);
      return NextResponse.redirect(pendingUrl);
    }

    if (userOrgSlug.toLowerCase() !== subdomain.toLowerCase()) {
      // User doesn't belong to this subdomain's org
      // Redirect to their own subdomain
      const correctUrl = new URL(pathname, `${request.nextUrl.protocol}//${userOrgSlug}.${APP_DOMAIN}`);
      return NextResponse.redirect(correctUrl);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // MODULE ACCESS CHECK (tier + enabledModules)
    // ─────────────────────────────────────────────────────────────────────────────

    // Check if the route requires a module that's not installed
    const enabledModules = (token.enabledModules as string[]) || ['assets', 'subscriptions', 'suppliers'];
    const moduleAccess = checkModuleAccess(pathname, enabledModules);

    if (!moduleAccess.allowed && moduleAccess.moduleId) {
      // Module not installed - redirect to modules page
      const modulesUrl = new URL('/admin/modules', request.url);
      modulesUrl.searchParams.set('install', moduleAccess.moduleId);
      modulesUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(modulesUrl);
    }

    // User belongs to this subdomain - allow access
    const response = NextResponse.next();
    response.headers.set('x-subdomain', subdomain);
    response.headers.set('x-tenant-id', token.organizationId as string);
    response.headers.set('x-tenant-slug', userOrgSlug);
    response.headers.set('x-user-id', token.id as string);
    response.headers.set('x-user-role', token.role as string || '');
    response.headers.set('x-org-role', token.orgRole as string || '');
    response.headers.set('x-subscription-tier', token.subscriptionTier as string || 'FREE');
    return response;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // MAIN DOMAIN ROUTING
  // ─────────────────────────────────────────────────────────────────────────────

  // Smart redirect for root on main domain
  if (pathname === '/') {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (token) {
      const orgSlug = token.organizationSlug as string | undefined;
      const isSuperAdmin = token.isSuperAdmin as boolean | undefined;

      // Super admins go to super admin dashboard
      if (isSuperAdmin) {
        return NextResponse.redirect(new URL('/super-admin', request.url));
      }

      if (orgSlug) {
        // User has org - redirect to their subdomain
        const subdomainUrl = new URL('/admin', `${request.nextUrl.protocol}//${orgSlug}.${APP_DOMAIN}`);
        return NextResponse.redirect(subdomainUrl);
      } else {
        // User has no org - go to pending (waiting for invitation)
        return NextResponse.redirect(new URL('/pending', request.url));
      }
    }
    // Not authenticated - show landing page (allow through)
    return NextResponse.next();
  }

  // Skip public routes on main domain
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Get JWT token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Redirect unauthenticated users to login
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check for super admin routes
  if (SUPER_ADMIN_ROUTES.some((route) => pathname.startsWith(route))) {
    const isSuperAdmin = token.isSuperAdmin as boolean | undefined;
    if (!isSuperAdmin) {
      // Not a super admin - redirect to home
      return NextResponse.redirect(new URL('/', request.url));
    }
    // Super admin accessing super admin routes - allow
    return NextResponse.next();
  }

  // Check for auth-only routes (setup, pending, etc.)
  if (AUTH_ONLY_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // For authenticated users on main domain trying to access /admin, /employee, etc.
  // Redirect them to their subdomain
  const orgSlug = token.organizationSlug as string | undefined;

  if (orgSlug && (pathname.startsWith('/admin') || pathname.startsWith('/employee'))) {
    const subdomainUrl = new URL(pathname, `${request.nextUrl.protocol}//${orgSlug}.${APP_DOMAIN}`);
    return NextResponse.redirect(subdomainUrl);
  }

  if (!orgSlug) {
    // User has no org - redirect to pending (waiting for invitation)
    return NextResponse.redirect(new URL('/pending', request.url));
  }

  // Default: inject tenant headers and continue
  const response = NextResponse.next();
  if (token.organizationId) {
    response.headers.set('x-tenant-id', token.organizationId as string);
    response.headers.set('x-tenant-slug', orgSlug);
    response.headers.set('x-user-id', token.id as string);
    response.headers.set('x-user-role', token.role as string || '');
    response.headers.set('x-org-role', token.orgRole as string || '');
    response.headers.set('x-subscription-tier', token.subscriptionTier as string || 'FREE');
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
