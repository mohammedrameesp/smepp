import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { formatError } from './errors';
import { logRequest, generateRequestId } from '@/lib/log';
import { checkRateLimit } from '@/lib/security/rateLimit';
import {
  TenantContext,
  TenantPrismaClient,
  getTenantContextFromHeaders,
  createTenantPrismaClient,
} from '@/lib/core/prisma-tenant';
import { prisma } from '@/lib/core/prisma';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface APIContext {
  params?: Record<string, string>;
  tenant?: TenantContext;
  prisma: TenantPrismaClient | typeof prisma;
}

export type APIHandler = (
  request: NextRequest,
  context: APIContext
) => Promise<NextResponse>;

export interface HandlerOptions {
  requireAuth?: boolean;
  requireAdmin?: boolean;
  requireTenant?: boolean; // Require tenant context (default: true for auth routes)
  skipLogging?: boolean;
  rateLimit?: boolean;
}

// Next.js 15 route context with async params
type RouteContext = { params: Promise<Record<string, string>> };

export function withErrorHandler(
  handler: APIHandler,
  options: HandlerOptions = {}
): (request: NextRequest, context: RouteContext) => Promise<NextResponse> {
  return async (request: NextRequest, routeContext: RouteContext) => {
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

      // Extract tenant context from headers (set by middleware)
      const tenantContext = getTenantContextFromHeaders(enhancedRequest.headers);

      // Check if tenant context is required (default: true for auth routes)
      const requireTenant = options.requireTenant ?? (options.requireAuth || options.requireAdmin);

      if (requireTenant && !tenantContext) {
        const response = NextResponse.json(
          { error: 'Organization context required', requestId },
          { status: 403 }
        );

        if (!options.skipLogging) {
          logRequest(
            request.method,
            request.url,
            403,
            Date.now() - startTime,
            requestId
          );
        }

        return response;
      }

      // Create tenant-scoped Prisma client or use global client
      const tenantPrisma = tenantContext
        ? createTenantPrismaClient(tenantContext)
        : prisma;

      // Await params from Next.js 15 route context
      const params = routeContext?.params ? await routeContext.params : undefined;

      // Build API context
      const apiContext: APIContext = {
        params,
        tenant: tenantContext || undefined,
        prisma: tenantPrisma,
      };

      // Execute the handler with tenant context
      const response = await handler(enhancedRequest, apiContext);
      
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