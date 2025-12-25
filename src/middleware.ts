import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import * as jose from 'jose';

// Impersonation cookie name (must match the one in verify route)
const IMPERSONATION_COOKIE = 'smepp-impersonation';

// Interface for impersonation data
interface ImpersonationData {
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
 */
async function getImpersonationData(request: NextRequest): Promise<ImpersonationData | null> {
  const cookie = request.cookies.get(IMPERSONATION_COOKIE);
  if (!cookie?.value) return null;

  try {
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'fallback-secret');
    const { payload } = await jose.jwtVerify(cookie.value, secret);
    return payload as unknown as ImpersonationData;
  } catch {
    return null;
  }
}

/**
 * Verify impersonation token from URL query parameter
 * This is used when the super admin first lands on the subdomain
 */
async function verifyImpersonationToken(token: string): Promise<{
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
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'fallback-secret');
    const { payload } = await jose.jwtVerify(token, secret);

    // Verify the token purpose
    if (payload.purpose !== 'impersonation') {
      return null;
    }

    return {
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
// MODULE ROUTE MAPPING (for route-level module protection)
// ═══════════════════════════════════════════════════════════════════════════════

const MODULE_ROUTES: Record<string, string[]> = {
  assets: ['/admin/assets', '/admin/asset-requests', '/employee/assets', '/employee/my-assets', '/employee/asset-requests'],
  subscriptions: ['/admin/subscriptions', '/employee/subscriptions'],
  suppliers: ['/admin/suppliers', '/employee/suppliers'],
  employees: ['/admin/employees'],
  leave: ['/admin/leave', '/employee/leave'],
  payroll: ['/admin/payroll', '/employee/payroll'],
  projects: ['/admin/projects', '/employee/projects'],
  'purchase-requests': ['/admin/purchase-requests', '/employee/purchase-requests'],
  documents: ['/admin/company-documents'],
};

// Tier requirements for each module
// NOTE: All modules are FREE for now - pricing tiers will be defined later
const MODULE_TIERS: Record<string, string> = {
  assets: 'FREE',
  subscriptions: 'FREE',
  suppliers: 'FREE',
  employees: 'FREE',
  leave: 'FREE',
  payroll: 'FREE',
  projects: 'FREE',
  'purchase-requests': 'FREE',
  documents: 'FREE',
};

// Tier hierarchy for comparison
const TIER_ORDER = ['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'];

/**
 * Check if the subscription tier allows access to a module
 */
function tierAllowsModule(tier: string, moduleId: string): boolean {
  const requiredTier = MODULE_TIERS[moduleId];
  if (!requiredTier) return true; // Unknown module, allow

  const currentTierIndex = TIER_ORDER.indexOf(tier);
  const requiredTierIndex = TIER_ORDER.indexOf(requiredTier);

  return currentTierIndex >= requiredTierIndex;
}

/**
 * Check if a path requires a specific module and if it's enabled AND tier allows it
 */
function checkModuleAccess(
  pathname: string,
  enabledModules: string[],
  subscriptionTier: string
): { allowed: boolean; moduleId?: string; reason?: 'not_installed' | 'upgrade_required' } {
  for (const [moduleId, routes] of Object.entries(MODULE_ROUTES)) {
    for (const route of routes) {
      if (pathname === route || pathname.startsWith(route + '/')) {
        // This route requires this module

        // First check tier - even if enabled, tier must allow it
        if (!tierAllowsModule(subscriptionTier, moduleId)) {
          return { allowed: false, moduleId, reason: 'upgrade_required' };
        }

        // Then check if module is enabled
        if (!enabledModules.includes(moduleId)) {
          return { allowed: false, moduleId, reason: 'not_installed' };
        }

        return { allowed: true };
      }
    }
  }
  // Route not controlled by any module
  return { allowed: true };
}

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
        // Create impersonation cookie data with all org context
        const cookieData = {
          superAdminId: tokenData.superAdminId,
          superAdminEmail: tokenData.superAdminEmail,
          superAdminName: tokenData.superAdminName,
          organizationId: tokenData.organizationId,
          organizationSlug: tokenData.organizationSlug,
          organizationName: tokenData.organizationName,
          subscriptionTier: tokenData.subscriptionTier,
          enabledModules: tokenData.enabledModules,
          startedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        };

        // Sign the cookie
        const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'fallback-secret');
        const cookieToken = await new jose.SignJWT(cookieData)
          .setProtectedHeader({ alg: 'HS256' })
          .setExpirationTime('4h')
          .sign(secret);

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

        // Set the impersonation cookie for subsequent requests
        response.cookies.set(IMPERSONATION_COOKIE, cookieToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 4 * 60 * 60, // 4 hours
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
      const moduleAccess = checkModuleAccess(pathname, enabledModules, subscriptionTier);

      if (!moduleAccess.allowed && moduleAccess.moduleId) {
        if (moduleAccess.reason === 'upgrade_required') {
          const upgradeUrl = new URL('/admin/settings/billing', request.url);
          upgradeUrl.searchParams.set('upgrade_for', moduleAccess.moduleId);
          return NextResponse.redirect(upgradeUrl);
        } else {
          const modulesUrl = new URL('/admin/modules', request.url);
          modulesUrl.searchParams.set('install', moduleAccess.moduleId);
          modulesUrl.searchParams.set('from', pathname);
          return NextResponse.redirect(modulesUrl);
        }
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

    // Check if the route requires a module that's not installed or not allowed by tier
    const enabledModules = (token.enabledModules as string[]) || ['assets', 'subscriptions', 'suppliers'];
    const subscriptionTier = (token.subscriptionTier as string) || 'FREE';
    const moduleAccess = checkModuleAccess(pathname, enabledModules, subscriptionTier);

    if (!moduleAccess.allowed && moduleAccess.moduleId) {
      if (moduleAccess.reason === 'upgrade_required') {
        // Tier doesn't allow this module - redirect to billing/upgrade page
        const upgradeUrl = new URL('/admin/settings/billing', request.url);
        upgradeUrl.searchParams.set('upgrade_for', moduleAccess.moduleId);
        return NextResponse.redirect(upgradeUrl);
      } else {
        // Module not installed - redirect to modules page
        const modulesUrl = new URL('/admin/modules', request.url);
        modulesUrl.searchParams.set('install', moduleAccess.moduleId);
        modulesUrl.searchParams.set('from', pathname);
        return NextResponse.redirect(modulesUrl);
      }
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
    return NextResponse.redirect(new URL('/super-admin/login', request.url));
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
