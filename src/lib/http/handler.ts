import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { formatError } from './errors';
import { logRequest, generateRequestId } from '@/lib/log';
import { checkRateLimit } from '@/lib/security/rateLimit';

 
export type APIHandler = (
  request: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context?: any
) => Promise<NextResponse>;

export interface HandlerOptions {
  requireAuth?: boolean;
  requireAdmin?: boolean;
  skipLogging?: boolean;
  rateLimit?: boolean; // Enable rate limiting for this endpoint
}

export function withErrorHandler(
  handler: APIHandler,
  options: HandlerOptions = {}
): APIHandler {
  return async (request: NextRequest, context?: { params?: any }) => {
    const startTime = Date.now();
    const requestId = request.headers.get('x-request-id') || generateRequestId();

    try {
      // Rate limiting check
      if (options.rateLimit) {
        const { allowed } = checkRateLimit(request);
        if (!allowed) {
          const response = NextResponse.json(
            {
              error: 'Rate limit exceeded',
              message: 'Too many requests. Please try again later.',
              requestId
            },
            {
              status: 429,
              headers: {
                'Retry-After': '60',
                'X-RateLimit-Limit': process.env.RATE_LIMIT_MAX || '60',
                'X-RateLimit-Window': process.env.RATE_LIMIT_WINDOW_MS || '60000',
              }
            }
          );

          if (!options.skipLogging) {
            logRequest(
              request.method,
              request.url,
              429,
              Date.now() - startTime,
              requestId
            );
          }

          return response;
        }
      }

      // Add request ID to headers for tracing
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-request-id', requestId);

      // Create new request with updated headers
      const enhancedRequest = new NextRequest(request.url, {
        method: request.method,
        headers: requestHeaders,
        body: request.body,
      });

      // Authentication check
      if (options.requireAuth || options.requireAdmin) {
        const session = await getServerSession(authOptions);
        
        if (!session) {
          const response = NextResponse.json(
            { error: 'Authentication required', requestId },
            { status: 401 }
          );
          
          if (!options.skipLogging) {
            logRequest(
              request.method,
              request.url,
              401,
              Date.now() - startTime,
              requestId
            );
          }
          
          return response;
        }

        if (options.requireAdmin && session.user.role !== 'ADMIN') {
          const response = NextResponse.json(
            { error: 'Admin access required', requestId },
            { status: 403 }
          );
          
          if (!options.skipLogging) {
            logRequest(
              request.method,
              request.url,
              403,
              Date.now() - startTime,
              requestId,
              session.user.id,
              session.user.email
            );
          }
          
          return response;
        }
      }

      // Execute the handler
      const response = await handler(enhancedRequest, context);
      
      // Add request ID to response headers
      response.headers.set('x-request-id', requestId);
      
      // Log successful request
      if (!options.skipLogging) {
        const session = await getServerSession(authOptions);
        logRequest(
          request.method,
          request.url,
          response.status,
          Date.now() - startTime,
          requestId,
          session?.user.id,
          session?.user.email
        );
      }
      
      return response;
      
    } catch (error) {
      // Format and log error
      const { response: errorResponse, statusCode } = formatError(
        error as Error,
        requestId
      );
      
      if (!options.skipLogging) {
        const session = await getServerSession(authOptions);
        logRequest(
          request.method,
          request.url,
          statusCode,
          Date.now() - startTime,
          requestId,
          session?.user.id,
          session?.user.email,
          error as Error
        );
      }
      
      const response = NextResponse.json(errorResponse, { status: statusCode });
      response.headers.set('x-request-id', requestId);
      
      return response;
    }
  };
}

// Utility to extract request ID from request
export function getRequestId(request: NextRequest): string {
  return request.headers.get('x-request-id') || generateRequestId();
}