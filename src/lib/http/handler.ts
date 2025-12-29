import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
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
import { hasModuleAccess, moduleNotInstalledResponse } from '@/lib/modules/access';
import { MODULE_REGISTRY } from '@/lib/modules/registry';
import { hasPermission as checkPermission } from '@/lib/access-control';
import { OrgRole } from '@prisma/client';

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
  requireModule?: string; // Require a specific module to be installed (e.g., 'assets', 'payroll')
  requirePermission?: string; // Require a specific permission (e.g., 'payroll:run', 'assets:edit')
  requireOrgRole?: OrgRole[]; // Require one of these organization roles
  skipLogging?: boolean;
  rateLimit?: boolean;
}

// Next.js 15 route handler type
type NextRouteHandler = (
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) => Promise<Response>;

export function withErrorHandler(
  handler: APIHandler,
  options: HandlerOptions = {}
): NextRouteHandler {
  return async (request: NextRequest, routeContext: { params: Promise<Record<string, string>> }): Promise<Response> => {
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

      // Module access check (enabledModules only - tier restrictions disabled)
      if (options.requireModule) {
        const session = await getServerSession(authOptions);
        const moduleId = options.requireModule;

        // Validate module exists
        if (!MODULE_REGISTRY[moduleId]) {
          console.warn(`[Handler] Unknown module "${moduleId}" in requireModule option`);
        }

        // Fetch fresh enabledModules from database (not session which may be stale)
        let enabledModules: string[] = [];

        if (tenantContext?.tenantId) {
          const org = await prisma.organization.findUnique({
            where: { id: tenantContext.tenantId },
            select: { enabledModules: true },
          });
          if (org) {
            enabledModules = org.enabledModules || [];
          }
        }

        // Check if module is enabled (tier check removed)
        if (!hasModuleAccess(moduleId, enabledModules)) {
          if (!options.skipLogging) {
            logRequest(
              request.method,
              request.url,
              403,
              Date.now() - startTime,
              requestId,
              session?.user.id,
              session?.user.email
            );
          }

          return moduleNotInstalledResponse(moduleId, requestId);
        }
      }

      // Organization role check
      if (options.requireOrgRole && options.requireOrgRole.length > 0) {
        if (!tenantContext?.orgRole || !options.requireOrgRole.includes(tenantContext.orgRole as OrgRole)) {
          const response = NextResponse.json(
            {
              error: 'Insufficient role',
              message: `This action requires one of the following roles: ${options.requireOrgRole.join(', ')}`,
              requestId
            },
            { status: 403 }
          );

          if (!options.skipLogging) {
            const session = await getServerSession(authOptions);
            logRequest(
              request.method,
              request.url,
              403,
              Date.now() - startTime,
              requestId,
              session?.user.id,
              session?.user.email
            );
          }

          return response;
        }
      }

      // Permission check
      if (options.requirePermission) {
        const session = await getServerSession(authOptions);

        if (!tenantContext?.tenantId || !tenantContext?.orgRole) {
          const response = NextResponse.json(
            { error: 'Permission check requires organization context', requestId },
            { status: 403 }
          );

          if (!options.skipLogging) {
            logRequest(
              request.method,
              request.url,
              403,
              Date.now() - startTime,
              requestId,
              session?.user.id,
              session?.user.email
            );
          }

          return response;
        }

        // Fetch enabledModules for permission check
        let enabledModules: string[] = [];
        const org = await prisma.organization.findUnique({
          where: { id: tenantContext.tenantId },
          select: { enabledModules: true },
        });
        if (org) {
          enabledModules = org.enabledModules || [];
        }

        const hasRequiredPermission = await checkPermission(
          tenantContext.tenantId,
          tenantContext.orgRole as OrgRole,
          options.requirePermission,
          enabledModules
        );

        if (!hasRequiredPermission) {
          const response = NextResponse.json(
            {
              error: 'Permission denied',
              message: `You do not have the required permission: ${options.requirePermission}`,
              required: options.requirePermission,
              requestId
            },
            { status: 403 }
          );

          if (!options.skipLogging) {
            logRequest(
              request.method,
              request.url,
              403,
              Date.now() - startTime,
              requestId,
              session?.user.id,
              session?.user.email
            );
          }

          return response;
        }
      }

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