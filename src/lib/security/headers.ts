/**
 * @file headers.ts
 * @description Security headers middleware for HTTP responses.
 * @module security
 *
 * ════════════════════════════════════════════════════════════════════════════════
 * SECURITY HEADERS APPLIED:
 * ════════════════════════════════════════════════════════════════════════════════
 *
 * | Header                       | Value                               | Protection |
 * |------------------------------|-------------------------------------|------------|
 * | X-Frame-Options              | DENY                                | Clickjacking |
 * | X-Content-Type-Options       | nosniff                             | MIME sniffing |
 * | X-XSS-Protection             | 1; mode=block                       | Reflected XSS (legacy) |
 * | Referrer-Policy              | strict-origin-when-cross-origin     | Referrer leakage |
 * | X-Download-Options           | noopen                              | File auto-execution |
 * | X-Permitted-Cross-Domain     | none                                | Flash/PDF policies |
 * | Permissions-Policy           | (restricted)                        | Browser features |
 * | Content-Security-Policy      | (see below)                         | XSS, injection |
 * | Strict-Transport-Security    | max-age=31536000; includeSubDomains | HTTPS enforcement |
 *
 * CSP POLICY:
 * - Development: Relaxed for hot reload and debugging
 * - Production: Strict self-only policy with minimal exceptions
 *
 * @see https://owasp.org/www-project-secure-headers/
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Add security headers to an HTTP response
 *
 * @param response - The NextResponse object to add headers to
 * @returns The same response object with security headers added
 *
 * @security Sets OWASP-recommended security headers
 * @security CSP is stricter in production than development
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  // Clickjacking protection - prevent page from being embedded in frames
  // @security DENY is stricter than SAMEORIGIN
  response.headers.set('X-Frame-Options', 'DENY');

  // MIME type sniffing protection - prevent browsers from guessing content type
  // @security Prevents attacks that upload HTML disguised as other file types
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // XSS protection - legacy header for older browsers (IE/Edge legacy)
  // @security Modern browsers use CSP instead, but this helps with older browsers
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Referrer policy - controls what referrer info is sent with requests
  // @security Prevents full URL (with sensitive params) from leaking to cross-origin
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Prevent automatic file execution on download (IE specific)
  response.headers.set('X-Download-Options', 'noopen');

  // Prevent cross-domain content loading by Flash/Acrobat
  // @security Blocks legacy plugin-based attacks
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');

  // Permissions Policy - restrict access to browser features
  // @security Disables potentially dangerous features like camera, microphone
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );

  // Content Security Policy
  const isDev = process.env.NODE_ENV === 'development';
  const csp = isDev
    // Development: Allow unsafe-inline/eval for hot reload, debugging
    ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' ws: wss:;"
    // Production: Strict policy - only self-hosted scripts
    // Note: 'unsafe-inline' for styles is required for many UI libraries (shadcn/ui)
    : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self'; connect-src 'self';";

  response.headers.set('Content-Security-Policy', csp);

  // HTTPS enforcement via HSTS (production only)
  // @security max-age=31536000 (1 year) + includeSubDomains + preload
  // @security preload allows inclusion in browser HSTS preload lists
  if (!isDev) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  return response;
}

export function securityHeadersMiddleware(_request: NextRequest): NextResponse {
  const response = NextResponse.next();
  return addSecurityHeaders(response);
}