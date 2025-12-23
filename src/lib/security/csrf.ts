import { NextRequest, NextResponse } from 'next/server';
import { randomBytes, createHmac } from 'crypto';

const CSRF_SECRET = process.env.NEXTAUTH_SECRET || 'dev-csrf-secret';
const CSRF_COOKIE_NAME = '__Host-csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';

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

export function validateCSRF(request: NextRequest): boolean {
  // Skip CSRF for JSON-only API endpoints (they use SameSite cookies for protection)
  const contentType = request.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return true;
  }

  // Skip for GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return true;
  }

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
  // Only apply CSRF protection to form submissions and certain endpoints
  const url = new URL(request.url);
  const shouldProtect = url.pathname.startsWith('/api/') && 
                       ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method) &&
                       !url.pathname.includes('/auth/'); // Skip NextAuth endpoints

  if (shouldProtect && !validateCSRF(request)) {
    return NextResponse.json(
      { error: 'CSRF token missing or invalid' },
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