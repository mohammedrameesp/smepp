import { NextRequest, NextResponse } from 'next/server';
import { randomBytes, createHmac } from 'crypto';

const CSRF_SECRET = process.env.NEXTAUTH_SECRET || 'dev-csrf-secret';
const CSRF_COOKIE_NAME = '__Host-csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';

// Get allowed origins from environment
function getAllowedOrigins(): string[] {
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost:3000';
  const protocol = appDomain.includes('localhost') ? 'http' : 'https';

  // Allow main domain and all subdomains
  const origins = [
    `${protocol}://${appDomain}`,
    `${protocol}://www.${appDomain}`,
  ];

  // In development, also allow localhost variants
  if (process.env.NODE_ENV !== 'production') {
    origins.push('http://localhost:3000');
    origins.push('http://127.0.0.1:3000');
  }

  return origins;
}

export function generateCSRFToken(): string {
  const token = randomBytes(32).toString('hex');
  return token;
}

export function signCSRFToken(token: string): string {
  const signature = createHmac('sha256', CSRF_SECRET)
    .update(token)
    .digest('hex');
  return `${token}.${signature}`;
}

export function verifyCSRFToken(signedToken: string): boolean {
  const [token, signature] = signedToken.split('.');
  if (!token || !signature) return false;

  const expectedSignature = createHmac('sha256', CSRF_SECRET)
    .update(token)
    .digest('hex');

  return signature === expectedSignature;
}

export function setCSRFCookie(response: NextResponse): string {
  const token = generateCSRFToken();
  const signedToken = signCSRFToken(token);

  response.cookies.set(CSRF_COOKIE_NAME, signedToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  });

  return token; // Return unsigned token for forms
}

/**
 * Validate Origin header for JSON API requests
 * This provides CSRF protection for JSON APIs without requiring tokens
 */
export function validateOriginForJSON(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  // If no origin (same-origin request or non-browser client), check referer
  if (!origin) {
    // No origin header - could be same-origin or non-browser
    // Check referer as fallback
    if (referer) {
      try {
        const refererUrl = new URL(referer);
        const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost:3000';
        // Allow if referer is from our domain or any subdomain
        if (refererUrl.host === appDomain || refererUrl.host.endsWith(`.${appDomain}`)) {
          return true;
        }
        // Development: allow localhost
        if (process.env.NODE_ENV !== 'production' &&
            (refererUrl.host === 'localhost:3000' || refererUrl.host === '127.0.0.1:3000')) {
          return true;
        }
      } catch {
        // Invalid referer URL
        return false;
      }
    }
    // No origin and no valid referer - allow for same-origin requests
    // (browsers always send origin for cross-origin, so missing origin = same-origin)
    return true;
  }

  // Validate origin against allowed list
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost:3000';
  try {
    const originUrl = new URL(origin);
    // Allow if origin is from our domain or any subdomain
    if (originUrl.host === appDomain || originUrl.host.endsWith(`.${appDomain}`)) {
      return true;
    }
    // Development: allow localhost
    if (process.env.NODE_ENV !== 'production' &&
        (originUrl.host === 'localhost:3000' || originUrl.host === '127.0.0.1:3000')) {
      return true;
    }
  } catch {
    // Invalid origin URL
    return false;
  }

  return false;
}

export function validateCSRF(request: NextRequest): boolean {
  // Skip for GET, HEAD, OPTIONS (safe methods)
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return true;
  }

  const contentType = request.headers.get('content-type');

  // For JSON API requests, validate Origin header instead of CSRF token
  // This is secure because:
  // 1. HTML forms cannot send application/json content type
  // 2. JavaScript fetch/XHR is subject to Same-Origin Policy
  // 3. Cross-origin requests require CORS preflight
  // 4. SameSite cookies prevent cookies from being sent cross-origin
  // 5. We additionally validate the Origin header for defense-in-depth
  if (contentType?.includes('application/json')) {
    return validateOriginForJSON(request);
  }

  // For form submissions, require CSRF token
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  const formToken = request.headers.get('x-form-csrf-token'); // For form submissions

  if (!cookieToken) return false;
  if (!verifyCSRFToken(cookieToken)) return false;

  const [unsignedCookieToken] = cookieToken.split('.');
  const submittedToken = headerToken || formToken;

  return submittedToken === unsignedCookieToken;
}

export function csrfMiddleware(request: NextRequest): NextResponse | null {
  // Only apply CSRF protection to mutations on API endpoints
  const url = new URL(request.url);
  const shouldProtect = url.pathname.startsWith('/api/') &&
                       ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method) &&
                       !url.pathname.includes('/auth/') && // Skip NextAuth endpoints
                       !url.pathname.includes('/webhooks/'); // Skip webhooks (they have their own auth)

  if (shouldProtect && !validateCSRF(request)) {
    const contentType = request.headers.get('content-type');
    const isJSON = contentType?.includes('application/json');

    console.log(`[CSRF] Blocked request to ${url.pathname} - ${isJSON ? 'invalid origin' : 'missing token'}`);

    return NextResponse.json(
      {
        error: 'CSRF validation failed',
        message: isJSON
          ? 'Request origin not allowed. Cross-origin requests are blocked.'
          : 'CSRF token missing or invalid',
      },
      { status: 403 }
    );
  }

  return null;
}

// Helper to get CSRF token for forms
export async function getCSRFToken(request: NextRequest): Promise<string> {
  const existingToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  
  if (existingToken && verifyCSRFToken(existingToken)) {
    return existingToken.split('.')[0];
  }
  
  return generateCSRFToken();
}