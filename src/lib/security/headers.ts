import { NextRequest, NextResponse } from 'next/server';

export function addSecurityHeaders(response: NextResponse): NextResponse {
  // Frame protection
  response.headers.set('X-Frame-Options', 'DENY');
  
  // Content type sniffing protection
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // XSS protection (legacy header, mostly for older browsers)
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy (relaxed for development)
  const isDev = process.env.NODE_ENV === 'development';
  const csp = isDev 
    ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; img-src 'self' data: blob: https:; font-src 'self' data:;"
    : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self';";
  
  response.headers.set('Content-Security-Policy', csp);
  
  // Prevent MIME type confusion
  response.headers.set('X-Download-Options', 'noopen');
  
  // Force HTTPS in production (but allow HTTP in development)
  if (!isDev) {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  return response;
}

export function securityHeadersMiddleware(_request: NextRequest): NextResponse {
  const response = NextResponse.next();
  return addSecurityHeaders(response);
}