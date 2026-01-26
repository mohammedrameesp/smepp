/**
 * @file handler.ts
 * @description Central API route handler wrapper with authentication, authorization,
 *              tenant isolation, rate limiting, and error handling.
 * @module http
 *
 * ════════════════════════════════════════════════════════════════════════════════
 * PURPOSE:
 * ════════════════════════════════════════════════════════════════════════════════
 * This is the CENTRAL SECURITY GATEWAY for all API routes in Durj.
 * Every API handler should use this wrapper to ensure consistent:
 *
 * 1. AUTHENTICATION - Validates NextAuth session exists and is valid
 * 2. AUTHORIZATION - Enforces role/permission/module requirements
 * 3. TENANT ISOLATION - Provides tenant-scoped Prisma client
 * 4. RATE LIMITING - Prevents abuse via token bucket algorithm
 * 5. REQUEST VALIDATION - Enforces body size limits
 * 6. ERROR HANDLING - Sanitizes errors, prevents info leakage
 * 7. LOGGING - Tracks all requests with context for debugging
 *
 * ════════════════════════════════════════════════════════════════════════════════
 * SECURITY EXECUTION ORDER:
 * ════════════════════════════════════════════════════════════════════════════════
 *
 *  1. Generate requestId for tracing
 *  2. Validate body size (for mutations)
 *  3. Check rate limit (for mutations by default)
 *  4. Authenticate (validate session)
 *  5. Check owner requirement
 *  6. Check admin requirement
 *  7. Check department access (HR/Finance/Operations)
 *  8. Check approval capability
 *  9. Extract tenant context from headers
 * 10. Verify impersonation token not revoked
 * 11. Verify tenant context exists (if required)
 * 12. Verify organization exists
 * 13. Create tenant-scoped Prisma client
 * 14. Check module access (if required)
 * 15. Check permission (if required)
 * 16. Execute handler
 * 17. Log request
 * 18. Return response
 *
 * ════════════════════════════════════════════════════════════════════════════════
 * USAGE EXAMPLES:
 * ════════════════════════════════════════════════════════════════════════════════
 *
 * @example Simple authenticated route
 * ```typescript
 * export const GET = withErrorHandler(
 *   async (request, { prisma }) => {
 *     const assets = await prisma.asset.findMany();
 *     return NextResponse.json(assets);
 *   },
 *   { requireAuth: true }
 * );
 * ```
 *
 * @example Admin-only route with module requirement
 * ```typescript
 * export const POST = withErrorHandler(
 *   async (request, { prisma, tenant }) => {
 *     const body = await request.json();
 *     const payroll = await prisma.payrollRun.create({ data: body });
 *     return NextResponse.json(payroll, { status: 201 });
 *   },
 *   {
 *     requireAdmin: true,
 *     requireModule: 'payroll',
 *   }
 * );
 * ```
 *
 * @example Route with specific permission
 * ```typescript
 * export const DELETE = withErrorHandler(
 *   async (request, { prisma, params }) => {
 *     await prisma.asset.delete({ where: { id: params?.id } });
 *     return new NextResponse(null, { status: 204 });
 *   },
 *   {
 *     requireAuth: true,
 *     requirePermission: 'assets:delete',
 *   }
 * );
 * ```
 *
 * @example Public route (no auth required)
 * ```typescript
 * export const GET = withErrorHandler(
 *   async (request) => {
 *     return NextResponse.json({ status: 'healthy' });
 *   },
 *   { requireAuth: false, requireTenant: false }
 * );
 * ```
 *
 * ════════════════════════════════════════════════════════════════════════════════
 * ERROR RESPONSE FORMAT:
 * ════════════════════════════════════════════════════════════════════════════════
 *
 * All error responses follow this structure:
 * ```json
 * {
 *   "error": "Error Type",
 *   "message": "Human-readable description",
 *   "code": "MACHINE_READABLE_CODE",
 *   "details": { ... },  // Optional: validation errors, etc.
 *   "requestId": "abc123xyz",
 *   "timestamp": "2024-01-26T12:00:00.000Z"
 * }
 * ```
 *
 * ERROR CODES:
 * - 401 AUTH_REQUIRED: No valid session
 * - 403 ADMIN_REQUIRED: Admin/owner role required
 * - 403 PERMISSION_DENIED: Missing permission or department access
 * - 403 TENANT_REQUIRED: Organization context missing
 * - 403 MODULE_NOT_INSTALLED: Module not enabled for organization
 * - 413 INVALID_REQUEST: Request body too large
 * - 429 RATE_LIMITED: Too many requests
 * - 500 INTERNAL_ERROR: Unexpected server error
 *
 * @security This is a CRITICAL security file - changes require careful review
 * @security NEVER expose stack traces or internal errors in production
 * @security ALWAYS use tenant-scoped Prisma client for business data
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, Session } from 'next-auth';
import { authOptions } from '@/lib/core/auth';
import { formatError, errorResponse, ErrorCodes, ErrorCode } from './errors';
import logger, { logRequest, generateRequestId } from '@/lib/core/log';
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
import { handleSystemError, getModuleFromPath } from '@/lib/core/error-logger';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Maximum JSON body size in bytes.
 * Uses constant from limits.ts, can be overridden via MAX_BODY_SIZE env var.
 * @default 1MB (1,048,576 bytes)
 */
const MAX_BODY_SIZE = parseInt(process.env.MAX_BODY_SIZE || String(MAX_BODY_SIZE_BYTES), 10);

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Context object passed to API handlers.
 *
 * @property params - Route parameters (e.g., { id: 'abc123' } for /api/assets/[id])
 * @property tenant - Tenant context with user/org info (null for public routes)
 * @property prisma - Tenant-scoped Prisma client (or global for non-tenant routes)
 *
 * @security The `prisma` client is tenant-scoped when `tenant` is present.
 *           All queries are automatically filtered by tenantId.
 */
export interface APIContext {
  /** Route parameters extracted from URL */
  params?: Record<string, string>;
  /** Tenant context (null for public routes) */
  tenant?: TenantContext;
  /**
   * Prisma client for database operations.
   * - When tenant context exists: Tenant-scoped (auto-filters by tenantId)
   * - When no tenant context: Global Prisma (use carefully!)
   */
  prisma: TenantPrismaClient | typeof prisma;
}

/**
 * API handler function signature.
 * Handlers receive the request and context, returning a NextResponse.
 */
export type APIHandler = (
  request: NextRequest,
  context: APIContext
) => Promise<NextResponse>;

/**
 * Configuration options for the withErrorHandler wrapper.
 *
 * @example Require authentication and admin role
 * ```typescript
 * { requireAuth: true, requireAdmin: true }
 * ```
 *
 * @example Require specific module and permission
 * ```typescript
 * { requireModule: 'payroll', requirePermission: 'payroll:run' }
 * ```
 */
export interface HandlerOptions {
  // ─────────────────────────────────────────────────────────────────────────────
  // AUTHENTICATION OPTIONS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Require a valid authenticated session.
   * @default true (if any require* option is set)
   *
   * When true:
   * - Session must exist and have a valid user ID
   * - Returns 401 AUTH_REQUIRED if not authenticated
   */
  requireAuth?: boolean;

  // ─────────────────────────────────────────────────────────────────────────────
  // AUTHORIZATION OPTIONS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Require admin access (isAdmin or isOwner flag).
   * Implies requireAuth: true.
   * Returns 403 ADMIN_REQUIRED if user lacks admin access.
   */
  requireAdmin?: boolean;

  /**
   * Require organization owner access (isOwner flag only).
   * More restrictive than requireAdmin.
   * Implies requireAuth: true.
   * Returns 403 ADMIN_REQUIRED if user is not owner.
   */
  requireOwner?: boolean;

  /**
   * Require approval capability.
   * User must have: isAdmin, canApprove, hasHRAccess, or hasFinanceAccess.
   * Implies requireAuth: true.
   * Returns 403 ADMIN_REQUIRED if user cannot approve.
   */
  requireCanApprove?: boolean;

  /**
   * Require Operations module access.
   * Grants access to: Assets, Subscriptions, Suppliers.
   * Admin/Owner automatically have this access.
   * Implies requireAuth: true.
   */
  requireOperationsAccess?: boolean;

  /**
   * Require HR module access.
   * Grants access to: Employees, Leave management.
   * Admin/Owner automatically have this access.
   * Implies requireAuth: true.
   */
  requireHRAccess?: boolean;

  /**
   * Require Finance module access.
   * Grants access to: Payroll, Purchase Requests.
   * Admin/Owner automatically have this access.
   * Implies requireAuth: true.
   */
  requireFinanceAccess?: boolean;

  // ─────────────────────────────────────────────────────────────────────────────
  // TENANT CONTEXT OPTIONS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Require tenant context (organization headers from middleware).
   * @default true when any auth option is enabled
   *
   * Set to false for routes that don't need org context:
   * - User profile endpoints
   * - Health check endpoints
   * - Platform-wide endpoints
   */
  requireTenant?: boolean;

  // ─────────────────────────────────────────────────────────────────────────────
  // MODULE & PERMISSION OPTIONS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Require a specific module to be installed for the organization.
   * Module IDs: 'assets', 'subscriptions', 'suppliers', 'employees',
   *             'leave', 'payroll', 'spend-requests', etc.
   *
   * @example requireModule: 'payroll'
   * Returns 403 MODULE_NOT_INSTALLED if module not enabled.
   */
  requireModule?: string;

  /**
   * Require a specific permission.
   * Format: 'module:action' (e.g., 'assets:delete', 'payroll:run')
   *
   * Admin/Owner automatically have all permissions.
   * Non-admin users are checked against RolePermission table.
   *
   * @example requirePermission: 'assets:delete'
   * Returns 403 PERMISSION_DENIED if permission not granted.
   */
  requirePermission?: string;

  // ─────────────────────────────────────────────────────────────────────────────
  // RATE LIMITING OPTIONS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Enable rate limiting for this endpoint.
   * @default true for POST, PUT, PATCH, DELETE methods
   *
   * Uses token bucket algorithm with Redis primary, in-memory fallback.
   * Default: 60 requests per minute per user/IP.
   */
  rateLimit?: boolean;

  /**
   * Explicitly skip rate limiting even for mutations.
   * Use sparingly - only for critical internal endpoints.
   */
  skipRateLimit?: boolean;

  // ─────────────────────────────────────────────────────────────────────────────
  // REQUEST VALIDATION OPTIONS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Maximum request body size in bytes.
   * @default 1MB (MAX_BODY_SIZE_BYTES)
   *
   * Override for endpoints that need larger payloads.
   * For file uploads, use skipBodySizeCheck instead.
   */
  maxBodySize?: number;

  /**
   * Skip body size validation.
   * Use for file upload endpoints where body is handled differently.
   */
  skipBodySizeCheck?: boolean;

  // ─────────────────────────────────────────────────────────────────────────────
  // LOGGING OPTIONS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Skip request logging for this endpoint.
   * Use for high-frequency endpoints like health checks.
   */
  skipLogging?: boolean;
}

/**
 * Next.js 15+ route handler type.
 * Route params are now a Promise that must be awaited.
 */
type NextRouteHandler = (
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) => Promise<Response>;

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a standardized error response with consistent headers and logging.
 *
 * @param errorTitle - Error type/title for the response
 * @param statusCode - HTTP status code
 * @param errorOptions - Additional error options (message, code, details)
 * @param requestId - Request ID for tracing
 * @param logInfo - Logging context (method, url, startTime, options)
 * @param session - User session (if available) for logging
 * @returns NextResponse with error payload and headers
 *
 * @internal
 */
function createErrorResponse(
  errorTitle: string,
  statusCode: number,
  errorOptions: {
    message?: string;
    code?: ErrorCode;
    details?: Record<string, unknown>;
  },
  requestId: string,
  logInfo?: {
    method: string;
    url: string;
    startTime: number;
    options: HandlerOptions;
    session?: Session | null;
  }
): NextResponse {
  const response = errorResponse(errorTitle, statusCode, errorOptions);
  response.headers.set('x-request-id', requestId);

  // Log the error if logging is enabled and log info provided
  if (logInfo && !logInfo.options.skipLogging) {
    logRequest(
      logInfo.method,
      logInfo.url,
      statusCode,
      Date.now() - logInfo.startTime,
      requestId,
      logInfo.session?.user?.id,
      logInfo.session?.user?.email
    );
  }

  return response;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HANDLER WRAPPER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Wraps an API handler with authentication, authorization, tenant isolation,
 * rate limiting, and error handling.
 *
 * This is the primary function for creating secure API routes in Durj.
 * All API routes should use this wrapper unless there's a specific reason not to.
 *
 * @param handler - The API handler function to wrap
 * @param options - Configuration options for security, rate limiting, etc.
 * @returns Next.js route handler with all security checks applied
 *
 * @security This function enforces all security checks in a specific order.
 *           Do not modify the order without careful security review.
 *
 * @example
 * ```typescript
 * export const GET = withErrorHandler(
 *   async (request, { prisma, tenant }) => {
 *     const assets = await prisma.asset.findMany();
 *     return NextResponse.json(assets);
 *   },
 *   { requireAuth: true, requireModule: 'assets' }
 * );
 * ```
 */
export function withErrorHandler(
  handler: APIHandler,
  options: HandlerOptions = {}
): NextRouteHandler {
  return async (
    request: NextRequest,
    routeContext: { params: Promise<Record<string, string>> }
  ): Promise<Response> => {
    const startTime = Date.now();
    const requestId = request.headers.get('x-request-id') || generateRequestId();

    // ─────────────────────────────────────────────────────────────────────────
    // SESSION CACHE
    // ─────────────────────────────────────────────────────────────────────────
    // Cache session to prevent multiple expensive getServerSession() calls.
    // Previously called 6 times per request, now called once and cached.
    let cachedSession: Session | null | undefined = undefined;
    const getSession = async (): Promise<Session | null> => {
      if (cachedSession === undefined) {
        cachedSession = await getServerSession(authOptions);
      }
      return cachedSession ?? null;
    };

    // ─────────────────────────────────────────────────────────────────────────
    // ORGANIZATION CACHE
    // ─────────────────────────────────────────────────────────────────────────
    // Cache organization lookup to avoid redundant queries for existence check,
    // module check, and permission check (previously 3 queries, now 1).
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

    // Helper for creating error responses with logging
    const makeErrorResponse = (
      errorTitle: string,
      statusCode: number,
      errorOptions: { message?: string; code?: ErrorCode; details?: Record<string, unknown> },
      session?: Session | null
    ) => createErrorResponse(
      errorTitle,
      statusCode,
      errorOptions,
      requestId,
      {
        method: request.method,
        url: request.url,
        startTime,
        options,
        session,
      }
    );

    try {
      const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method);

      // ═══════════════════════════════════════════════════════════════════════
      // STEP 1: BODY SIZE VALIDATION
      // ═══════════════════════════════════════════════════════════════════════
      // Check Content-Length header before processing request.
      // Prevents memory exhaustion from oversized payloads.
      if (isMutation && !options.skipBodySizeCheck) {
        const contentLength = request.headers.get('content-length');
        const maxSize = options.maxBodySize || MAX_BODY_SIZE;

        if (contentLength && parseInt(contentLength, 10) > maxSize) {
          return makeErrorResponse(
            'Payload Too Large',
            413,
            {
              message: `Request body exceeds maximum size of ${Math.round(maxSize / 1024)}KB`,
              code: ErrorCodes.INVALID_REQUEST,
            }
          );
        }
      }

      // ═══════════════════════════════════════════════════════════════════════
      // STEP 2: RATE LIMITING
      // ═══════════════════════════════════════════════════════════════════════
      // Apply rate limiting before authentication to protect against brute force.
      // Default: enabled for mutations, configurable via options.
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
            logRequest(request.method, request.url, 429, Date.now() - startTime, requestId);
          }

          return response;
        }
      }

      // ═══════════════════════════════════════════════════════════════════════
      // STEP 3: PREPARE ENHANCED REQUEST
      // ═══════════════════════════════════════════════════════════════════════
      // Add request ID to headers for downstream tracing.
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-request-id', requestId);

      const enhancedRequest = new NextRequest(request.url, {
        method: request.method,
        headers: requestHeaders,
        body: request.body,
      });

      // ═══════════════════════════════════════════════════════════════════════
      // STEP 4: AUTHENTICATION CHECK
      // ═══════════════════════════════════════════════════════════════════════
      // Determine if authentication is required based on any auth-related option.
      const requiresAuth = options.requireAuth ||
        options.requireAdmin ||
        options.requireOwner ||
        options.requireCanApprove ||
        options.requireOperationsAccess ||
        options.requireHRAccess ||
        options.requireFinanceAccess;

      if (requiresAuth) {
        const session = await getSession();

        // SECURITY: Session must exist AND have a valid user ID.
        // User ID becomes undefined when session is invalidated (e.g., password change).
        if (!session || !session.user?.id) {
          return makeErrorResponse(
            'Unauthorized',
            401,
            {
              message: 'Authentication required',
              code: ErrorCodes.AUTH_REQUIRED,
            }
          );
        }

        // ═════════════════════════════════════════════════════════════════════
        // STEP 5: OWNER CHECK (Most restrictive)
        // ═════════════════════════════════════════════════════════════════════
        if (options.requireOwner && !session.user.isOwner) {
          return makeErrorResponse(
            'Forbidden',
            403,
            {
              message: 'Organization owner access required',
              code: ErrorCodes.ADMIN_REQUIRED,
            },
            session
          );
        }

        // ═════════════════════════════════════════════════════════════════════
        // STEP 6: ADMIN CHECK (Owner implies admin)
        // ═════════════════════════════════════════════════════════════════════
        if (options.requireAdmin && !session.user.isAdmin && !session.user.isOwner) {
          return makeErrorResponse(
            'Forbidden',
            403,
            {
              message: 'Admin access required',
              code: ErrorCodes.ADMIN_REQUIRED,
            },
            session
          );
        }

        // ═════════════════════════════════════════════════════════════════════
        // STEP 7: DEPARTMENT ACCESS CHECKS
        // ═════════════════════════════════════════════════════════════════════

        // Operations access (Assets, Subscriptions, Suppliers)
        // Admin/Owner bypass this check
        if (options.requireOperationsAccess &&
            !session.user.isAdmin &&
            !session.user.isOwner &&
            !session.user.hasOperationsAccess) {
          return makeErrorResponse(
            'Forbidden',
            403,
            {
              message: 'Operations module access required',
              code: ErrorCodes.PERMISSION_DENIED,
            },
            session
          );
        }

        // HR access (Employees, Leave)
        // Admin/Owner bypass this check
        if (options.requireHRAccess &&
            !session.user.isAdmin &&
            !session.user.isOwner &&
            !session.user.hasHRAccess) {
          return makeErrorResponse(
            'Forbidden',
            403,
            {
              message: 'HR module access required',
              code: ErrorCodes.PERMISSION_DENIED,
            },
            session
          );
        }

        // Finance access (Payroll, Purchase Requests)
        // Admin/Owner bypass this check
        if (options.requireFinanceAccess &&
            !session.user.isAdmin &&
            !session.user.isOwner &&
            !session.user.hasFinanceAccess) {
          return makeErrorResponse(
            'Forbidden',
            403,
            {
              message: 'Finance module access required',
              code: ErrorCodes.PERMISSION_DENIED,
            },
            session
          );
        }

        // ═════════════════════════════════════════════════════════════════════
        // STEP 8: APPROVAL CAPABILITY CHECK
        // ═════════════════════════════════════════════════════════════════════
        // Users with HR/Finance access can approve requests in their domain
        if (options.requireCanApprove) {
          const canApproveRequests =
            session.user.isAdmin ||
            session.user.canApprove ||
            session.user.hasHRAccess ||
            session.user.hasFinanceAccess;

          if (!canApproveRequests) {
            return makeErrorResponse(
              'Forbidden',
              403,
              {
                message: 'Approval access required',
                code: ErrorCodes.ADMIN_REQUIRED,
              },
              session
            );
          }
        }
      }

      // ═══════════════════════════════════════════════════════════════════════
      // STEP 9: EXTRACT TENANT CONTEXT
      // ═══════════════════════════════════════════════════════════════════════
      // Tenant context is set by middleware from authenticated session.
      // Headers: x-tenant-id, x-tenant-slug, x-user-id, x-user-role, etc.
      const tenantContext = getTenantContextFromHeaders(enhancedRequest.headers);

      // ═══════════════════════════════════════════════════════════════════════
      // STEP 10: IMPERSONATION TOKEN REVOCATION CHECK
      // ═══════════════════════════════════════════════════════════════════════
      // If this is an impersonation request, verify the token hasn't been revoked.
      // Supports both individual token and bulk revocation by super admin.
      const isImpersonating = enhancedRequest.headers.get('x-impersonating') === 'true';
      const impersonationJti = enhancedRequest.headers.get('x-impersonation-jti');
      const impersonatorId = enhancedRequest.headers.get('x-impersonator-id');
      const impersonationIat = enhancedRequest.headers.get('x-impersonation-iat');

      if (isImpersonating && impersonationJti) {
        const issuedAt = impersonationIat
          ? new Date(parseInt(impersonationIat, 10) * 1000)
          : undefined;
        const revoked = await isTokenRevoked(
          impersonationJti,
          impersonatorId || undefined,
          issuedAt
        );

        if (revoked) {
          // Log blocked impersonation attempt to audit trail
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

      // ═══════════════════════════════════════════════════════════════════════
      // STEP 11: TENANT CONTEXT REQUIREMENT CHECK
      // ═══════════════════════════════════════════════════════════════════════
      // Default: require tenant context when any auth option is enabled.
      const requireTenant = options.requireTenant ?? requiresAuth;

      if (requireTenant && !tenantContext) {
        return makeErrorResponse(
          'Forbidden',
          403,
          {
            message: 'Organization context required',
            code: ErrorCodes.TENANT_REQUIRED,
          }
        );
      }

      // ═══════════════════════════════════════════════════════════════════════
      // STEP 12: ORGANIZATION EXISTENCE CHECK
      // ═══════════════════════════════════════════════════════════════════════
      // Verify the organization still exists (handles deleted org case).
      // Uses cached lookup to avoid redundant queries.
      if (requireTenant && tenantContext?.tenantId) {
        const org = await getOrganization(tenantContext.tenantId);

        if (!org) {
          return makeErrorResponse(
            'Forbidden',
            403,
            {
              message: 'Organization no longer exists',
              code: ErrorCodes.TENANT_REQUIRED,
            }
          );
        }
      }

      // ═══════════════════════════════════════════════════════════════════════
      // STEP 13: CREATE TENANT-SCOPED PRISMA CLIENT
      // ═══════════════════════════════════════════════════════════════════════
      // When tenant context exists, create a Prisma client that automatically
      // filters all queries by tenantId. Otherwise use global Prisma.
      const tenantPrisma = tenantContext
        ? createTenantPrismaClient(tenantContext)
        : prisma;

      // ═══════════════════════════════════════════════════════════════════════
      // STEP 14: MODULE ACCESS CHECK
      // ═══════════════════════════════════════════════════════════════════════
      // Verify the required module is enabled for this organization.
      if (options.requireModule) {
        const session = await getSession();
        const moduleId = options.requireModule;

        // Log warning for unknown modules (configuration error)
        if (!MODULE_REGISTRY[moduleId]) {
          logger.warn(
            { moduleId, path: request.url },
            `Unknown module "${moduleId}" in requireModule option`
          );
        }

        // Fetch fresh enabledModules from database (not session which may be stale)
        let enabledModules: string[] = [];

        if (tenantContext?.tenantId) {
          const org = await getOrganization(tenantContext.tenantId);
          if (org) {
            enabledModules = org.enabledModules || [];
          }
        }

        // Check if module is enabled
        if (!hasModuleAccess(moduleId, enabledModules)) {
          if (!options.skipLogging) {
            logRequest(
              request.method,
              request.url,
              403,
              Date.now() - startTime,
              requestId,
              session?.user?.id,
              session?.user?.email
            );
          }

          const response = moduleNotInstalledResponse(moduleId, requestId);
          response.headers.set('x-request-id', requestId);
          return response;
        }
      }

      // ═══════════════════════════════════════════════════════════════════════
      // STEP 15: PERMISSION CHECK
      // ═══════════════════════════════════════════════════════════════════════
      // Verify the user has the required permission.
      // Admin/Owner automatically have all permissions.
      if (options.requirePermission) {
        const session = await getSession();

        if (!tenantContext?.tenantId) {
          return makeErrorResponse(
            'Forbidden',
            403,
            {
              message: 'Permission check requires organization context',
              code: ErrorCodes.TENANT_REQUIRED,
            },
            session
          );
        }

        // Fetch enabledModules for permission check
        let enabledModules: string[] = [];
        const org = await getOrganization(tenantContext.tenantId);
        if (org) {
          enabledModules = org.enabledModules || [];
        }

        // Check permission using boolean flags
        const isOwner = session?.user?.isOwner ?? false;
        const isAdmin = session?.user?.isAdmin ?? false;

        const hasRequiredPermission = await checkPermission(
          tenantContext.tenantId,
          isOwner,
          isAdmin,
          options.requirePermission,
          enabledModules
        );

        if (!hasRequiredPermission) {
          return makeErrorResponse(
            'Forbidden',
            403,
            {
              message: `You do not have the required permission: ${options.requirePermission}`,
              code: ErrorCodes.PERMISSION_DENIED,
              details: { requiredPermission: options.requirePermission },
            },
            session
          );
        }
      }

      // ═══════════════════════════════════════════════════════════════════════
      // STEP 16: PREPARE HANDLER CONTEXT
      // ═══════════════════════════════════════════════════════════════════════
      // Await params from Next.js 15 route context
      const params = routeContext?.params ? await routeContext.params : undefined;

      // Enhance tenant context with boolean flags from session
      let enhancedTenantContext = tenantContext;
      if (tenantContext) {
        const session = await getSession();
        enhancedTenantContext = {
          ...tenantContext,
          isOwner: session?.user?.isOwner ?? false,
          isAdmin: session?.user?.isAdmin ?? false,
          hasHRAccess: session?.user?.hasHRAccess ?? false,
          hasFinanceAccess: session?.user?.hasFinanceAccess ?? false,
          hasOperationsAccess: session?.user?.hasOperationsAccess ?? false,
          canApprove: session?.user?.canApprove ?? false,
        };
      }

      // Build API context for handler
      const apiContext: APIContext = {
        params,
        tenant: enhancedTenantContext || undefined,
        prisma: tenantPrisma,
      };

      // ═══════════════════════════════════════════════════════════════════════
      // STEP 17: EXECUTE HANDLER
      // ═══════════════════════════════════════════════════════════════════════
      const response = await handler(enhancedRequest, apiContext);

      // Add request ID to response headers for tracing
      response.headers.set('x-request-id', requestId);

      // ═══════════════════════════════════════════════════════════════════════
      // STEP 18: LOG SUCCESS
      // ═══════════════════════════════════════════════════════════════════════
      if (!options.skipLogging) {
        const session = await getSession();
        logRequest(
          request.method,
          request.url,
          response.status,
          Date.now() - startTime,
          requestId,
          session?.user?.id,
          session?.user?.email
        );
      }

      return response;

    } catch (error) {
      // ═════════════════════════════════════════════════════════════════════════
      // ERROR HANDLING
      // ═════════════════════════════════════════════════════════════════════════
      // Format error response, sanitizing sensitive information in production.
      const { response: errorResponseData, statusCode } = formatError(
        error as Error,
        requestId
      );

      if (!options.skipLogging) {
        // Safely get session for logging (may fail if error was in session lookup)
        let session: Session | null = null;
        try {
          session = await getSession();
        } catch {
          // Session lookup failed - continue without session context
        }

        logRequest(
          request.method,
          request.url,
          statusCode,
          Date.now() - startTime,
          requestId,
          session?.user?.id,
          session?.user?.email,
          error as Error
        );

        // Log to database for super admin visibility (non-blocking)
        const tenantContext = getTenantContextFromHeaders(request.headers);
        handleSystemError({
          type: 'API_ERROR',
          source: getModuleFromPath(request.url),
          tenantId: tenantContext?.tenantId,
          requestId,
          method: request.method,
          path: new URL(request.url).pathname,
          userId: session?.user?.id,
          userEmail: session?.user?.email,
          userRole: session?.user?.isAdmin ? 'ADMIN' : session?.user?.isOwner ? 'OWNER' : 'MEMBER',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          statusCode,
          userAgent: request.headers.get('user-agent') || undefined,
          severity: statusCode >= 500 ? 'error' : 'warning',
        }).catch(() => {
          // Non-blocking - database error logging should never fail the response
        });
      }

      const response = NextResponse.json(errorResponseData, { status: statusCode });
      response.headers.set('x-request-id', requestId);

      return response;
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extract request ID from request headers.
 * Falls back to generating a new one if not present.
 *
 * @param request - The incoming NextRequest
 * @returns Request ID string
 */
export function getRequestId(request: NextRequest): string {
  return request.headers.get('x-request-id') || generateRequestId();
}

/**
 * Extract and validate tenant context from API context.
 * Throws an error if tenant context is missing (caught by withErrorHandler).
 *
 * This is a convenience function for handlers that need to assert tenant
 * context exists while getting properly typed access to the database and IDs.
 *
 * @param context - API context from handler
 * @returns Validated tenant context with typed Prisma client
 * @throws Error if tenant context is missing
 *
 * @example
 * ```typescript
 * export const GET = withErrorHandler(async (request, context) => {
 *   const { db, tenantId, userId } = extractTenantContext(context);
 *   const assets = await db.asset.findMany();
 *   return NextResponse.json(assets);
 * }, { requireAuth: true });
 * ```
 */
export function extractTenantContext(context: APIContext): {
  /** Tenant-scoped Prisma client */
  db: TenantPrismaClient;
  /** Organization ID */
  tenantId: string;
  /** Current user's ID */
  userId: string;
  /** Full tenant context object */
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