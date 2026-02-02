/**
 * @module AdminLayout
 * @description Server-side layout component for the admin dashboard.
 * Handles authentication, authorization, impersonation, and tenant context.
 *
 * Key responsibilities:
 * - Validates user session and admin/department-level access
 * - Supports super admin impersonation via signed JWT cookie
 * - Fetches tenant-scoped badge counts and organization settings
 * - Enforces view-mode cookie for admin/employee view switching
 * - Handles deleted organization redirect
 */

import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { unstable_noStore as noStore } from 'next/cache';
import { jwtVerify } from 'jose';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { AdminLayoutClient } from './layout-client';
import { checkWhatsAppVerificationNeeded } from '@/lib/utils/whatsapp-verification-check';
import type { Metadata } from 'next';

// Impersonation cookie name (must match middleware)
const IMPERSONATION_COOKIE = 'durj-impersonation';

// Get JWT secret for impersonation token verification
function getJwtSecret(): Uint8Array | null {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

// Verify impersonation cookie and extract data
async function getImpersonationFromCookie(): Promise<{
  isImpersonating: boolean;
  tenantId?: string;
  impersonatorEmail?: string;
}> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(IMPERSONATION_COOKIE);

    if (!cookie?.value) {
      return { isImpersonating: false };
    }

    const secret = getJwtSecret();
    if (!secret) {
      return { isImpersonating: false };
    }

    const { payload } = await jwtVerify(cookie.value, secret);

    // Verify the token purpose
    if (payload.purpose !== 'impersonation') {
      return { isImpersonating: false };
    }

    return {
      isImpersonating: true,
      tenantId: payload.organizationId as string,
      impersonatorEmail: payload.superAdminEmail as string,
    };
  } catch {
    return { isImpersonating: false };
  }
}

// Force dynamic rendering to prevent caching issues
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Dynamic page titles with organization name
export async function generateMetadata(): Promise<Metadata> {
  const session = await getServerSession(authOptions);
  const orgName = session?.user?.organizationName || 'Durj';

  return {
    title: {
      template: `%s | ${orgName}`,
      default: `Dashboard | ${orgName}`,
    },
  };
}

// Get organization settings from database (fresh, not from session)
// Returns null if organization doesn't exist (was deleted)
async function getOrgSettings(tenantId: string): Promise<{ enabledModules: string[]; aiChatEnabled: boolean } | null> {
  const org = await prisma.organization.findUnique({
    where: { id: tenantId },
    select: { enabledModules: true, aiChatEnabled: true },
  });

  // Return null if org doesn't exist (deleted)
  if (!org) {
    return null;
  }

  return {
    enabledModules: org.enabledModules?.length ? org.enabledModules : ['assets', 'subscriptions', 'suppliers'],
    aiChatEnabled: org.aiChatEnabled ?? false,
  };
}

// Get badge counts with tenant filtering (no caching to ensure tenant isolation)
async function getBadgeCounts(tenantId: string) {
  const [
    pendingChangeRequests,
    pendingLeaveRequests,
    pendingSuppliers,
    pendingSpendRequests,
    pendingAssetRequestsCount,
    pendingAssetReturnsCount,
    pendingApprovalSteps,
  ] = await Promise.all([
    prisma.profileChangeRequest.count({ where: { tenantId, status: 'PENDING' } }),
    prisma.leaveRequest.count({ where: { tenantId, status: 'PENDING' } }),
    prisma.supplier.count({ where: { tenantId, status: 'PENDING' } }),
    prisma.spendRequest.count({ where: { tenantId, status: 'PENDING' } }),
    prisma.assetRequest.count({ where: { tenantId, status: 'PENDING_ADMIN_APPROVAL' } }),
    prisma.assetRequest.count({ where: { tenantId, status: 'PENDING_RETURN_APPROVAL' } }),
    // Count distinct entities with pending approval steps (tenant-scoped)
    prisma.approvalStep.groupBy({
      by: ['entityType', 'entityId'],
      where: { tenantId, status: 'PENDING' },
    }).then((groups) => groups.length),
  ]);

  return {
    pendingChangeRequests,
    pendingLeaveRequests,
    pendingSuppliers,
    pendingSpendRequests,
    pendingAssetRequests: pendingAssetRequestsCount + pendingAssetReturnsCount,
    pendingApprovals: pendingApprovalSteps,
  };
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Prevent any caching of this layout
  noStore();

  // Check for super admin impersonation by reading the cookie directly
  // This is more reliable than middleware headers which may not propagate correctly
  const impersonation = await getImpersonationFromCookie();
  const isImpersonating = impersonation.isImpersonating;
  const impersonatorEmail = impersonation.impersonatorEmail || null;
  const impersonatedTenantId = impersonation.tenantId || null;

  const session = await getServerSession(authOptions);

  // PROD-003: Auth bypass only when DEV_AUTH_ENABLED is explicitly set
  // Never bypass auth based on NODE_ENV alone (could be misconfigured in production)
  const devAuthEnabled = process.env.DEV_AUTH_ENABLED === 'true';

  // If impersonating, skip normal auth checks - middleware already validated the token
  if (!isImpersonating) {
    // Redirect unauthenticated users
    if (!session && !devAuthEnabled) {
      redirect('/login');
    }

    // Redirect users without any admin/department access
    // Check isAdmin flag OR department access flags OR canApprove (managers)
    const isAdmin = session?.user?.isOwner || session?.user?.isAdmin;
    const hasAdminAccess = isAdmin ||
                           session?.user?.hasFinanceAccess ||
                           session?.user?.hasHRAccess ||
                           session?.user?.hasOperationsAccess ||
                           session?.user?.canApprove; // Managers can access for approvals

    if (!hasAdminAccess && !devAuthEnabled) {
      redirect('/employee');
    }

    // SEC-CRIT-1: Enforce view-mode cookie for admins who switched to employee view
    // This prevents admins from bypassing employee view by manually navigating to /admin
    if (isAdmin) {
      const cookieStore = await cookies();
      const viewModeCookie = cookieStore.get('durj-view-mode');
      if (viewModeCookie?.value === 'employee') {
        redirect('/employee');
      }
    }
  }

  // Get tenant-scoped data - use impersonated tenant ID if impersonating
  const tenantId = isImpersonating ? impersonatedTenantId : session?.user?.organizationId;
  const isAdmin = isImpersonating ? true : (session?.user?.isOwner || session?.user?.isAdmin);

  let badgeCounts = {
    pendingChangeRequests: 0,
    pendingLeaveRequests: 0,
    pendingSuppliers: 0,
    pendingSpendRequests: 0,
    pendingAssetRequests: 0,
    pendingApprovals: 0,
  };
  let orgSettings = { enabledModules: ['assets', 'subscriptions', 'suppliers'], aiChatEnabled: false };
  let whatsAppVerification = {
    needsVerification: false,
    phoneNumber: null as string | null,
    countryCode: null as string | null,
  };

  if (tenantId) {
    const userId = session?.user?.id;
    const [fetchedBadgeCounts, fetchedOrgSettings, fetchedWhatsAppVerification] = await Promise.all([
      getBadgeCounts(tenantId),
      getOrgSettings(tenantId),
      userId ? checkWhatsAppVerificationNeeded(tenantId, userId) : Promise.resolve(null),
    ]);

    // Check if organization still exists
    if (!fetchedOrgSettings) {
      // Organization was deleted - redirect to auto-signout page
      redirect('/org-deleted');
    }

    badgeCounts = fetchedBadgeCounts;
    orgSettings = fetchedOrgSettings;

    if (fetchedWhatsAppVerification) {
      whatsAppVerification = {
        needsVerification: fetchedWhatsAppVerification.needsVerification,
        phoneNumber: fetchedWhatsAppVerification.phoneNumber,
        countryCode: fetchedWhatsAppVerification.countryCode,
      };
    }
  }

  return (
    <AdminLayoutClient
      badgeCounts={badgeCounts}
      enabledModules={orgSettings.enabledModules}
      aiChatEnabled={orgSettings.aiChatEnabled}
      isAdmin={isAdmin}
      canApprove={isImpersonating ? true : session?.user?.canApprove}
      hasFinanceAccess={isImpersonating ? true : session?.user?.hasFinanceAccess}
      hasHRAccess={isImpersonating ? true : session?.user?.hasHRAccess}
      hasOperationsAccess={isImpersonating ? true : session?.user?.hasOperationsAccess}
      whatsAppVerification={whatsAppVerification}
      isImpersonating={isImpersonating}
      impersonatorEmail={impersonatorEmail}
    >
      {children}
    </AdminLayoutClient>
  );
}

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes:
 *   - Added JSDoc module documentation at top
 *   - Removed unused 'headers' import from 'next/headers'
 * Issues: None
 */
