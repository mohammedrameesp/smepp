import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * Multi-Tenant Middleware
 *
 * Extracts tenant context from the authenticated session and injects it into
 * request headers for downstream API routes to use.
 */

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/signup',
  '/api/auth',
  '/api/webhooks',
  '/verify',
  '/invite',
  '/pricing',
  '/features',
  '/about',
  '/_next',
  '/favicon.ico',
];

// Routes that require authentication but not organization
const AUTH_ONLY_ROUTES = [
  '/onboarding',
  '/api/organizations', // Creating first org
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Special handling for root route - smart redirect based on auth status
  if (pathname === '/') {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (token) {
      // Authenticated user - redirect based on org status
      if (token.organizationId) {
        return NextResponse.redirect(new URL('/admin', request.url));
      } else {
        return NextResponse.redirect(new URL('/onboarding', request.url));
      }
    }
    // Not authenticated - show landing page
    return NextResponse.next();
  }

  // Skip public routes
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

  // Create response with tenant headers
  const response = NextResponse.next();

  // Inject tenant context headers for API routes
  if (token.organizationId) {
    response.headers.set('x-tenant-id', token.organizationId as string);
    response.headers.set('x-tenant-slug', token.organizationSlug as string || '');
    response.headers.set('x-user-id', token.id as string);
    response.headers.set('x-user-role', token.role as string || '');
    response.headers.set('x-org-role', token.orgRole as string || '');
    response.headers.set('x-subscription-tier', token.subscriptionTier as string || 'FREE');
  } else {
    // User is authenticated but has no organization
    // Redirect to onboarding unless already on auth-only routes
    if (!AUTH_ONLY_ROUTES.some((route) => pathname.startsWith(route))) {
      return NextResponse.redirect(new URL('/onboarding', request.url));
    }
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
