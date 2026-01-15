/**
 * @file handler.ts
 * @description Central API route handler wrapper with authentication, authorization,
 *              tenant isolation, rate limiting, and error handling.
 * @module http
 *
 * PURPOSE:
 * Wraps all API route handlers with standardized security and observability:
 * - Authentication (NextAuth session)
 * - Authorization (role-based, permission-based, module-based)
 * - Tenant isolation (via prisma-tenant extension)
 * - Rate limiting (token bucket per tenant)
 * - Request/response logging
 * - Error formatting
 *
 * USAGE:
 * ```typescript
 * // Simple authenticated route
 * export const GET = withErrorHandler(handler, { requireAuth: true });
 *
 * // Admin-only route with module requirement
 * export const POST = withErrorHandler(handler, {
 *   requireAdmin: true,
 *   requireModule: 'payroll'
 * });
 *
 * // Route with specific permission
 * export const DELETE = withErrorHandler(handler, {
 *   requireAuth: true,
 *   requirePermission: 'assets:delete'
 * });
 * ```
 *
 * SECURITY FLOW:
 * 1. Rate limit check (if mutation)
 * 2. Body size validation (if mutation)
 * 3. Session authentication
 * 4. Admin role check (if required)
 * 5. Tenant context extraction
 * 6. Module access check (if required)
 * 7. Organization role check (if required)
 * 8. Permission check (if required)
 * 9. Execute handler with tenant-scoped Prisma
 * 10. Log and return response
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, Session } from 'next-auth';
import { authOptions } from '@/lib/core/auth';
import { formatError, errorResponse, ErrorCodes } from './errors';
import { logRequest, generateRequestId } from '@/lib/core/log';
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
import { MAX_BODY_SIZE_BYTES } from '@/lib/constants/limits';
import { isTokenRevoked } from '@/lib/security/impersonation';
import { logAction, ActivityActions } from '@/lib/core/activity';

// Maximum JSON body size - uses constant from limits.ts, can be overridden via env
const MAX_BODY_SIZE = parseInt(process.env.MAX_BODY_SIZE || String(MAX_BODY_SIZE_BYTES), 10);

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
  requireOwner?: boolean; // Require organization owner (isOwner flag)
  requireCanApprove?: boolean; // Require approval capability (isAdmin or canApprove flag)
  requireOperationsAccess?: boolean; // Require Operations module access (Assets, Subscriptions, Suppliers)
  requireHRAccess?: boolean; // Require HR module access (Employees, Leave)
  requireFinanceAccess?: boolean; // Require Finance module access (Payroll, Purchase Requests)
  requireTenant?: boolean; // Require tenant context (default: true for auth routes)
  requireModule?: string; // Require a specific module to be installed (e.g., 'assets', 'payroll')
  requirePermission?: string; // Require a specific permission (e.g., 'payroll:run', 'assets:edit')
  skipLogging?: boolean;
  rateLimit?: boolean; // Enable rate limiting (default: true for POST/PUT/PATCH/DELETE)
  skipRateLimit?: boolean; // Explicitly skip rate limiting even for mutations
  maxBodySize?: number; // Maximum request body size in bytes (default: 1MB)
  skipBodySizeCheck?: boolean; // Skip body size validation (for file uploads)
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

    // Session cache - fetched once, reused throughout the request lifecycle
    // This prevents multiple expensive getServerSession() calls per request (was 6, now 1)
    let cachedSession: Session | null | undefined;
    const getSession = async () => {
      if (cachedSession === undefined) {
        cachedSession = await getServerSession(authOptions);
      }
      return cachedSession;
    };

    // Organization cache - fetched once, reused for existence check, module check, and permission check
    // This prevents 3 separate org queries per authenticated request
    let cachedOrg: { id: string; enabledModules: string[] } | null | undefined;
    const getOrganization = async (tenantId: string) => {
      if (cachedOrg === undefined) {
        cachedOrg = await prisma.organization.findUnique({
          where: { id: tenantId },
          select: { id: true, enabledModules: true },
        });
      }
      return cachedOrg;
    };

    try {
      const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method);

      // Body size validation for requests with body (API-003)
      if (isMutation && !options.skipBodySizeCheck) {
        const contentLength = request.headers.get('content-length');
        const maxSize = options.maxBodySize || MAX_BODY_SIZE;

        if (contentLength && parseInt(contentLength, 10) > maxSize) {
          const response = errorResponse('Payload Too Large', 413, {
            message: `Request body exceeds maximum size of ${Math.round(maxSize / 1024)}KB`,
            code: ErrorCodes.INVALID_REQUEST,
          });
          response.headers.set('x-request-id', requestId);

          if (!options.skipLogging) {
            logRequest(request.method, request.url, 413, Date.now() - startTime, requestId);
          }

          return response;
        }
      }

      // Rate limiting check (API-002: enabled by default for mutations)
      const shouldRateLimit = options.rateLimit ?? (isMutation && !options.skipRateLimit);

      if (shouldRateLimit) {
        const { allowed } = await checkRateLimit(request);
        if (!allowed) {
          const response = errorResponse('Rate Limit Exceeded', 429, {
            message: 'Too many requests. Please try again later.',
            code: ErrorCodes.RATE_LIMITED,
          });
          response.headers.set('x-request-id', requestId);
          response.headers.set('Retry-After', '60');
          response.headers.set('X-RateLimit-Limit', process.env.RATE_LIMIT_MAX || '60');
          response.headers.set('X-RateLimit-Window', process.env.RATE_LIMIT_WINDOW_MS || '60000');

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
      if (options.requireAuth || options.requireAdmin || options.requireOwner || options.requireCanApprove ||
          options.requireOperationsAccess || options.requireHRAccess || options.requireFinanceAccess) {
        const session = await getSession();

        if (!session) {
          const response = errorResponse('Unauthorized', 401, {
            message: 'Authentication required',
            code: ErrorCodes.AUTH_REQUIRED,
          });
          response.headers.set('x-request-id', requestId);

          if (!options.skipLogging) {
            logRequest(request.method, request.url, 401, Date.now() - startTime, requestId);
          }

          return response;
        }

        // Check for owner access
        if (options.requireOwner && !session.user.isOwner) {
          const response = errorResponse('Forbidden', 403, {
            message: 'Organization owner access required',
            code: ErrorCodes.ADMIN_REQUIRED,
          });
          response.headers.set('x-request-id', requestId);

          if (!options.skipLogging) {
            logRequest(
              request.method, request.url, 403, Date.now() - startTime,
              requestId, session.user.id, session.user.email
            );
          }

          return response;
        }

        // Check for admin access (new boolean-based system)
        // Note: isOwner implies admin access
        if (options.requireAdmin && !session.user.isAdmin && !session.user.isOwner) {
          const response = errorResponse('Forbidden', 403, {
            message: 'Admin access required',
            code: ErrorCodes.ADMIN_REQUIRED,
          });
          response.headers.set('x-request-id', requestId);

          if (!options.skipLogging) {
            logRequest(
              request.method, request.url, 403, Date.now() - startTime,
              requestId, session.user.id, session.user.email
            );
          }

          return response;
        }

        // Check for Operations module access (Assets, Subscriptions, Suppliers)
        // Admin/Owner bypass this check
        if (options.requireOperationsAccess &&
            !session.user.isAdmin && !session.user.isOwner && !session.user.hasOperationsAccess) {
          const response = errorResponse('Forbidden', 403, {
            message: 'Operations module access required',
            code: ErrorCodes.PERMISSION_DENIED,
          });
          response.headers.set('x-request-id', requestId);

          if (!options.skipLogging) {
            logRequest(
              request.method, request.url, 403, Date.now() - startTime,
              requestId, session.user.id, session.user.email
            );
          }

          return response;
        }

        // Check for HR module access (Employees, Leave)
        // Admin/Owner bypass this check
        if (options.requireHRAccess &&
            !session.user.isAdmin && !session.user.isOwner && !session.user.hasHRAccess) {
          const response = errorResponse('Forbidden', 403, {
            message: 'HR module access required',
            code: ErrorCodes.PERMISSION_DENIED,
          });
          response.headers.set('x-request-id', requestId);

          if (!options.skipLogging) {
            logRequest(
              request.method, request.url, 403, Date.now() - startTime,
              requestId, session.user.id, session.user.email
            );
          }

          return response;
        }

        // Check for Finance module access (Payroll, Purchase Requests)
        // Admin/Owner bypass this check
        if (options.requireFinanceAccess &&
            !session.user.isAdmin && !session.user.isOwner && !session.user.hasFinanceAccess) {
          const response = errorResponse('Forbidden', 403, {
            message: 'Finance module access required',
            code: ErrorCodes.PERMISSION_DENIED,
          });
          response.headers.set('x-request-id', requestId);

          if (!options.skipLogging) {
            logRequest(
              request.method, request.url, 403, Date.now() - startTime,
              requestId, session.user.id, session.user.email
            );
          }

          return response;
        }

        // Check for approval capability (isAdmin or canApprove flag)
        if (options.requireCanApprove) {
          const canApproveRequests = session.user.isAdmin || session.user.canApprove;

          if (!canApproveRequests) {
            const response = errorResponse('Forbidden', 403, {
              message: 'Approval access required',
              code: ErrorCodes.ADMIN_REQUIRED,
            });
            response.headers.set('x-request-id', requestId);

            if (!options.skipLogging) {
              logRequest(
                request.method, request.url, 403, Date.now() - startTime,
                requestId, session.user.id, session.user.email
              );
            }

            return response;
          }
        }
      }

      // Extract tenant context from headers (set by middleware)
      const tenantContext = getTenantContextFromHeaders(enhancedRequest.headers);

      // ───────────────────────────────────────────────────────────────────────────
      // IMPERSONATION TOKEN REVOCATION CHECK (SEC-009)
      // ───────────────────────────────────────────────────────────────────────────
      // Check if this is an impersonation request and if the token has been revoked
      // Supports both individual token revocation and bulk revocation by super admin
      const isImpersonating = enhancedRequest.headers.get('x-impersonating') === 'true';
      const impersonationJti = enhancedRequest.headers.get('x-impersonation-jti');
      const impersonatorId = enhancedRequest.headers.get('x-impersonator-id');
      const impersonationIat = enhancedRequest.headers.get('x-impersonation-iat');

      if (isImpersonating && impersonationJti) {
        // Pass superAdminId and issuedAt for bulk revocation checking
        const issuedAt = impersonationIat ? new Date(parseInt(impersonationIat, 10) * 1000) : undefined;
        const revoked = await isTokenRevoked(impersonationJti, impersonatorId || undefined, issuedAt);
        if (revoked) {
          // Log to audit trail instead of console (SEC-010)
          if (tenantContext?.tenantId) {
            logAction(
              tenantContext.tenantId,
              null, // No actor - this is a security system event
              ActivityActions.SECURITY_IMPERSONATION_BLOCKED,
              'SECURITY',
              impersonationJti,
              {
                jti: impersonationJti,
                path: request.url,
                reason: 'Token revoked',
                timestamp: new Date().toISOString(),
              }
            );
          }

          const response = errorResponse('Unauthorized', 401, {
            message: 'Impersonation session has been revoked',
            code: ErrorCodes.AUTH_REQUIRED,
          });
          response.headers.set('x-request-id', requestId);
          // Clear the impersonation cookie
          response.cookies.set('durj-impersonation', '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/',
            maxAge: 0,
          });

          if (!options.skipLogging) {
            logRequest(request.method, request.url, 401, Date.now() - startTime, requestId);
          }

          return response;
        }
      }

      // Check if tenant context is required (default: true for auth routes)
      const requireTenant = options.requireTenant ?? (options.requireAuth || options.requireAdmin ||
        options.requireOwner || options.requireCanApprove || options.requireOperationsAccess ||
        options.requireHRAccess || options.requireFinanceAccess);

      if (requireTenant && !tenantContext) {
        const response = errorResponse('Forbidden', 403, {
          message: 'Organization context required',
          code: ErrorCodes.TENANT_REQUIRED,
        });
        response.headers.set('x-request-id', requestId);

        if (!options.skipLogging) {
          logRequest(request.method, request.url, 403, Date.now() - startTime, requestId);
        }

        return response;
      }

      // Verify organization still exists (handles deleted org case)
      // Uses cached org lookup to avoid redundant queries
      if (requireTenant && tenantContext?.tenantId) {
        const org = await getOrganization(tenantContext.tenantId);

        if (!org) {
          const response = errorResponse('Forbidden', 403, {
            message: 'Organization no longer exists',
            code: ErrorCodes.TENANT_REQUIRED,
          });
          response.headers.set('x-request-id', requestId);

          if (!options.skipLogging) {
            logRequest(request.method, request.url, 403, Date.now() - startTime, requestId);
          }

          return response;
        }
      }

      // Create tenant-scoped Prisma client or use global client
      const tenantPrisma = tenantContext
        ? createTenantPrismaClient(tenantContext)
        : prisma;

      // Module access check (enabledModules only - tier restrictions disabled)
      if (options.requireModule) {
        const session = await getSession();
        const moduleId = options.requireModule;

        // Validate module exists
        if (!MODULE_REGISTRY[moduleId]) {
          console.warn(`[Handler] Unknown module "${moduleId}" in requireModule option`);
        }

        // Fetch fresh enabledModules from database (not session which may be stale)
        // Uses cached org lookup to avoid redundant queries
        let enabledModules: string[] = [];

        if (tenantContext?.tenantId) {
          const org = await getOrganization(tenantContext.tenantId);
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

      // Permission check
      if (options.requirePermission) {
        const session = await getSession();

        if (!tenantContext?.tenantId) {
          const response = errorResponse('Forbidden', 403, {
            message: 'Permission check requires organization context',
            code: ErrorCodes.TENANT_REQUIRED,
          });
          response.headers.set('x-request-id', requestId);

          if (!options.skipLogging) {
            logRequest(
              request.method, request.url, 403, Date.now() - startTime,
              requestId, session?.user.id, session?.user.email
            );
          }

          return response;
        }

        // Fetch enabledModules for permission check
        // Uses cached org lookup to avoid redundant queries
        let enabledModules: string[] = [];
        const org = await getOrganization(tenantContext.tenantId);
        if (org) {
          enabledModules = org.enabledModules || [];
        }

        // Use boolean flags for permission check
        const isOwner = session?.user.isOwner ?? false;
        const isAdmin = session?.user.isAdmin ?? false;

        const hasRequiredPermission = await checkPermission(
          tenantContext.tenantId,
          isOwner,
          isAdmin,
          options.requirePermission,
          enabledModules
        );

        if (!hasRequiredPermission) {
          const response = errorResponse('Forbidden', 403, {
            message: `You do not have the required permission: ${options.requirePermission}`,
            code: ErrorCodes.PERMISSION_DENIED,
            details: { requiredPermission: options.requirePermission },
          });
          response.headers.set('x-request-id', requestId);

          if (!options.skipLogging) {
            logRequest(
              request.method, request.url, 403, Date.now() - startTime,
              requestId, session?.user.id, session?.user.email
            );
          }

          return response;
        }
      }

      // Await params from Next.js 15 route context
      const params = routeContext?.params ? await routeContext.params : undefined;

      // Enhance tenant context with boolean flags from session
      let enhancedTenantContext = tenantContext;
      if (tenantContext) {
        const session = await getSession();
        enhancedTenantContext = {
          ...tenantContext,
          isOwner: session?.user.isOwner ?? false,
          isAdmin: session?.user.isAdmin ?? false,
        };
      }

      // Build API context
      const apiContext: APIContext = {
        params,
        tenant: enhancedTenantContext || undefined,
        prisma: tenantPrisma,
      };

      // Execute the handler with tenant context
      const response = await handler(enhancedRequest, apiContext);
      
      // Add request ID to response headers
      response.headers.set('x-request-id', requestId);
      
      // Log successful request
      if (!options.skipLogging) {
        const session = await getSession();
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
        const session = await getSession();
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

/**
 * Extract and validate tenant context from API context.
 * Throws an error if tenant context is missing (caught by withErrorHandler).
 *
 * @example
 * export const GET = withErrorHandler(async (request, context) => {
 *   const { db, tenantId, userId } = extractTenantContext(context);
 *   const assets = await db.asset.findMany();
 *   return NextResponse.json(assets);
 * }, { requireAuth: true });
 */
export function extractTenantContext(context: APIContext): {
  db: TenantPrismaClient;
  tenantId: string;
  userId: string;
  tenant: TenantContext;
} {
  const { tenant, prisma } = context;

  if (!tenant?.tenantId) {
    throw new Error('Tenant context required');
  }

  return {
    db: prisma as TenantPrismaClient,
    tenantId: tenant.tenantId,
    userId: tenant.userId,
    tenant,
  };
}