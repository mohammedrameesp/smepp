/**
 * Shared utility for checking impersonation status in server components.
 * This should be used by all admin pages to properly handle super admin impersonation.
 */

import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/core/auth';

const IMPERSONATION_COOKIE = 'durj-impersonation';

interface ImpersonationResult {
  isImpersonating: boolean;
  tenantId: string | null;
  impersonatorEmail: string | null;
}

interface AuthResult {
  isImpersonating: boolean;
  tenantId: string | null;
  isAdmin: boolean;
  hasFinanceAccess: boolean;
  hasHRAccess: boolean;
  hasOperationsAccess: boolean;
  canApprove: boolean;
  userId: string | null;
  session: Awaited<ReturnType<typeof getServerSession>>;
}

/**
 * Check if there's a valid impersonation cookie
 */
export async function checkImpersonation(): Promise<ImpersonationResult> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(IMPERSONATION_COOKIE);

    if (!cookie?.value) {
      return { isImpersonating: false, tenantId: null, impersonatorEmail: null };
    }

    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      return { isImpersonating: false, tenantId: null, impersonatorEmail: null };
    }

    const { payload } = await jwtVerify(cookie.value, new TextEncoder().encode(secret));

    if (payload.purpose !== 'impersonation') {
      return { isImpersonating: false, tenantId: null, impersonatorEmail: null };
    }

    return {
      isImpersonating: true,
      tenantId: payload.organizationId as string,
      impersonatorEmail: payload.superAdminEmail as string,
    };
  } catch {
    return { isImpersonating: false, tenantId: null, impersonatorEmail: null };
  }
}

/**
 * Get auth context for admin pages, accounting for impersonation.
 * When impersonating, grants full admin access and uses impersonated tenant ID.
 */
export async function getAdminAuthContext(): Promise<AuthResult> {
  const impersonation = await checkImpersonation();
  const session = await getServerSession(authOptions);

  if (impersonation.isImpersonating) {
    // Super admin impersonating - grant full access
    return {
      isImpersonating: true,
      tenantId: impersonation.tenantId,
      isAdmin: true,
      hasFinanceAccess: true,
      hasHRAccess: true,
      hasOperationsAccess: true,
      canApprove: true,
      userId: null, // No real user when impersonating
      session,
    };
  }

  // Normal user - use session data
  return {
    isImpersonating: false,
    tenantId: session?.user?.organizationId || null,
    isAdmin: session?.user?.isOwner || session?.user?.isAdmin || false,
    hasFinanceAccess: session?.user?.hasFinanceAccess || false,
    hasHRAccess: session?.user?.hasHRAccess || false,
    hasOperationsAccess: session?.user?.hasOperationsAccess || false,
    canApprove: session?.user?.canApprove || false,
    userId: session?.user?.id || null,
    session,
  };
}

/**
 * Check if user has access to a specific department route.
 * Returns true if impersonating or if user has required access.
 */
export function hasAccess(
  auth: AuthResult,
  requiredAccess?: 'finance' | 'hr' | 'operations' | 'admin'
): boolean {
  if (auth.isImpersonating) return true;
  if (auth.isAdmin) return true;
  if (!requiredAccess) return true;

  switch (requiredAccess) {
    case 'finance':
      return auth.hasFinanceAccess;
    case 'hr':
      return auth.hasHRAccess;
    case 'operations':
      return auth.hasOperationsAccess;
    case 'admin':
      return auth.isAdmin;
    default:
      return false;
  }
}
