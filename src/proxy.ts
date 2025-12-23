import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function proxy(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    // Simple security headers (Edge Runtime compatible)
    let response = NextResponse.next();

    // Protect admin routes - only check authentication, let page component handle authorization
    if (pathname.startsWith('/admin')) {
      if (!token) {
        response = NextResponse.redirect(new URL('/login', req.url));
      }
      // If authenticated but not admin, let the page component redirect to /forbidden
    }

    // Add basic security headers
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'origin-when-cross-origin');

    return response;
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Allow static files (images, fonts, etc.)
        if (
          pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|ico|css|js)$/) ||
          pathname.startsWith('/_next/') ||
          pathname.startsWith('/api/')
        ) {
          return true;
        }

        // Allow PWA files (must be public for installation)
        if (pathname === '/manifest.json' || pathname === '/service-worker.js') {
          return true;
        }

        // Allow public routes
        if (pathname === '/' || pathname === '/login' || pathname.startsWith('/api/auth') || pathname.startsWith('/api/health')) {
          return true;
        }

        // Allow supplier registration (public)
        if (pathname.startsWith('/suppliers/register')) {
          return true;
        }

        // Require authentication for all other routes
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (images, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.svg|.*\\.ico|.*\\.gif|.*\\.webp).*)',
  ],
};