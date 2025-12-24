import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * Multi-Tenant Middleware
 *
 * Handles:
 * 1. Subdomain-based tenant routing (acme.smepp.com)
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
  '/platform-login', // Super admin login (legacy)
  '/super-admin/login', // Super admin login with 2FA
  '/api/auth',
  '/api/webhooks',
  '/api/public', // Public APIs (tenant branding, etc.)
  '/api/super-admin/auth', // Super admin auth APIs (login, verify-2fa)
  '/api/super-admin/stats', // Platform stats for login page
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
  '/api/subdomains', // Subdomain availability check
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
    // Not authenticated - redirect to super admin login
    return NextResponse.redirect(new URL('/platform-login', request.url));
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
