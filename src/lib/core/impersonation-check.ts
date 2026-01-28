/**
 * @file impersonation-check.ts
 * @module lib/core/impersonation
 * @description Server-side utilities for checking super admin impersonation status.
 * Used by admin pages to determine auth context and permissions when a super admin
 * is viewing a tenant's data for support/debugging purposes.
 *
 * @security This module handles sensitive impersonation logic. The JWT token is
 * cryptographically verified using NEXTAUTH_SECRET. Failed verifications are logged
 * for security auditing.
 *
 * @example
 * ```ts
 * // In a server component or page
 * const auth = await getAdminAuthContext();
 *
 * if (!hasAccess(auth, 'finance')) {
 *   redirect('/forbidden');
 * }
 *
 * // Use auth.tenantId for data queries
 * const data = await db.asset.findMany({ where: { tenantId: auth.tenantId } });
 * ```
 */

import { cookies } from 'next/headers';
import { jwtVerify, JWTPayload } from 'jose';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/core/auth';
import logger from '@/lib/core/log';

/** Cookie name for impersonation session token */
const IMPERSONATION_COOKIE = 'durj-impersonation';

/** Default result when not impersonating or verification fails */
const NOT_IMPERSONATING: ImpersonationResult = {
  isImpersonating: false,
  tenantId: null,
  impersonatorEmail: null,
} as const;

/**
 * JWT payload structure for impersonation tokens.
 * @internal
 */
interface ImpersonationJWTPayload extends JWTPayload {
  /** Token purpose - must be 'impersonation' */
  purpose: string;
  /** Target organization ID being impersonated */
  organizationId: string;
  /** Super admin's email address */
  superAdminEmail: string;
  /** Super admin's user ID */
  superAdminId: string;
}

/**
 * Result of checking impersonation status.
 */
export interface ImpersonationResult {
  /** Whether a valid impersonation session is active */
  isImpersonating: boolean;
  /** The tenant ID being impersonated, or null if not impersonating */
  tenantId: string | null;
  /** The super admin's email, or null if not impersonating */
  impersonatorEmail: string | null;
}

/**
 * Authentication context for admin pages.
 * Combines impersonation status with user permissions.
 */
export interface AuthResult {
  /** Whether a super admin is impersonating this tenant */
  isImpersonating: boolean;
  /** The current tenant ID (from impersonation or session) */
  tenantId: string | null;
  /** Whether user has admin privileges */
  isAdmin: boolean;
  /** Whether user can access finance features */
  hasFinanceAccess: boolean;
  /** Whether user can access HR features */
  hasHRAccess: boolean;
  /** Whether user can access operations features */
  hasOperationsAccess: boolean;
  /** Whether user can approve requests */
  canApprove: boolean;
  /** The user's ID, or null if impersonating */
  userId: string | null;
  /** The NextAuth session object */
  session: Awaited<ReturnType<typeof getServerSession>>;
}

/** Valid department access types for permission checks */
export type DepartmentAccess = 'finance' | 'hr' | 'operations' | 'admin';

/**
 * Type guard to validate JWT payload has required impersonation fields.
 * @param payload - The JWT payload to validate
 * @returns True if payload has all required impersonation fields
 */
function isValidImpersonationPayload(
  payload: JWTPayload
): payload is ImpersonationJWTPayload {
  return (
    typeof payload.purpose === 'string' &&
    typeof payload.organizationId === 'string' &&
    typeof payload.superAdminEmail === 'string'
  );
}

/**
 * Check if there's a valid impersonation cookie.
 *
 * Reads the impersonation cookie, verifies the JWT signature, and validates
 * the token purpose. Returns impersonation details if valid.
 *
 * @returns Impersonation status with tenant ID and impersonator email if active
 *
 * @security
 * - JWT is verified with NEXTAUTH_SECRET
 * - Token purpose must be 'impersonation'
 * - Failed verifications are logged for security auditing
 *
 * @example
 * ```ts
 * const result = await checkImpersonation();
 * if (result.isImpersonating) {
 *   console.log(`Super admin ${result.impersonatorEmail} is viewing tenant ${result.tenantId}`);
 * }
 * ```
 */
export async function checkImpersonation(): Promise<ImpersonationResult> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(IMPERSONATION_COOKIE);

    if (!cookie?.value) {
      return NOT_IMPERSONATING;
    }

    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      logger.error('NEXTAUTH_SECRET not configured - impersonation check failed');
      return NOT_IMPERSONATING;
    }

    const { payload } = await jwtVerify(
      cookie.value,
      new TextEncoder().encode(secret)
    );

    // Validate token purpose and required fields
    if (payload.purpose !== 'impersonation' || !isValidImpersonationPayload(payload)) {
      logger.warn(
        { purpose: payload.purpose },
        'Invalid impersonation token purpose'
      );
      return NOT_IMPERSONATING;
    }

    return {
      isImpersonating: true,
      tenantId: payload.organizationId,
      impersonatorEmail: payload.superAdminEmail,
    };
  } catch (error) {
    // Log verification failures for security auditing (could be attack attempts)
    logger.debug(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      'Impersonation token verification failed'
    );
    return NOT_IMPERSONATING;
  }
}

/**
 * Get authentication context for admin pages, accounting for impersonation.
 *
 * When a super admin is impersonating, grants full admin access and uses the
 * impersonated tenant ID. Otherwise, returns permissions from the user's session.
 *
 * @returns Auth context with tenant ID, permissions, and session
 *
 * @example
 * ```ts
 * export default async function AdminPage() {
 *   const auth = await getAdminAuthContext();
 *
 *   if (!auth.tenantId) {
 *     redirect('/login');
 *   }
 *
 *   if (!hasAccess(auth, 'hr')) {
 *     redirect('/forbidden');
 *   }
 *
 *   // Fetch tenant-scoped data
 *   const employees = await db.employee.findMany({
 *     where: { tenantId: auth.tenantId }
 *   });
 * }
 * ```
 */
export async function getAdminAuthContext(): Promise<AuthResult> {
  const [impersonation, session] = await Promise.all([
    checkImpersonation(),
    getServerSession(authOptions),
  ]);

  // Super admin impersonating - grant full access
  if (impersonation.isImpersonating) {
    return {
      isImpersonating: true,
      tenantId: impersonation.tenantId,
      isAdmin: true,
      hasFinanceAccess: true,
      hasHRAccess: true,
      hasOperationsAccess: true,
      canApprove: true,
      userId: null,
      session,
    };
  }

  // Normal user - derive permissions from session
  const user = session?.user;

  return {
    isImpersonating: false,
    tenantId: user?.organizationId ?? null,
    isAdmin: user?.isOwner || user?.isAdmin || false,
    hasFinanceAccess: user?.hasFinanceAccess ?? false,
    hasHRAccess: user?.hasHRAccess ?? false,
    hasOperationsAccess: user?.hasOperationsAccess ?? false,
    canApprove: user?.canApprove ?? false,
    userId: user?.id ?? null,
    session,
  };
}

/**
 * Check if user has access to a specific department route.
 *
 * Returns true if:
 * - User is impersonating (super admin)
 * - User is an admin
 * - No specific access is required
 * - User has the required department access
 *
 * @param auth - The auth context from getAdminAuthContext()
 * @param requiredAccess - The department access level required (optional)
 * @returns True if user has access, false otherwise
 *
 * @example
 * ```ts
 * const auth = await getAdminAuthContext();
 *
 * // Check specific department access
 * if (!hasAccess(auth, 'finance')) {
 *   return <AccessDenied />;
 * }
 *
 * // No specific access required (any authenticated user)
 * if (!hasAccess(auth)) {
 *   return <AccessDenied />;
 * }
 * ```
 */
export function hasAccess(
  auth: AuthResult,
  requiredAccess?: DepartmentAccess
): boolean {
  // Super admins and regular admins have full access
  if (auth.isImpersonating || auth.isAdmin) {
    return true;
  }

  // No specific access required
  if (!requiredAccess) {
    return true;
  }

  // Check department-specific access
  switch (requiredAccess) {
    case 'finance':
      return auth.hasFinanceAccess;
    case 'hr':
      return auth.hasHRAccess;
    case 'operations':
      return auth.hasOperationsAccess;
    case 'admin':
      return auth.isAdmin;
    default: {
      // Exhaustive check - TypeScript will error if a case is missing
      const _exhaustive: never = requiredAccess;
      return false;
    }
  }
}
