import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { unstable_noStore as noStore } from 'next/cache';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { AdminLayoutClient } from './layout-client';
import type { Metadata } from 'next';

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
    pendingPurchaseRequests,
    pendingAssetRequestsCount,
    pendingAssetReturnsCount,
    pendingApprovalSteps,
  ] = await Promise.all([
    prisma.profileChangeRequest.count({ where: { tenantId, status: 'PENDING' } }),
    prisma.leaveRequest.count({ where: { tenantId, status: 'PENDING' } }),
    prisma.supplier.count({ where: { tenantId, status: 'PENDING' } }),
    prisma.purchaseRequest.count({ where: { tenantId, status: 'PENDING' } }),
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
    pendingPurchaseRequests,
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

  const session = await getServerSession(authOptions);

  // PROD-003: Auth bypass only when DEV_AUTH_ENABLED is explicitly set
  // Never bypass auth based on NODE_ENV alone (could be misconfigured in production)
  const devAuthEnabled = process.env.DEV_AUTH_ENABLED === 'true';

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

  // DEBUG: Log to Vercel function logs - VERSION 3
  console.log('[AdminLayout] Access check v3:', JSON.stringify({
    email: session?.user?.email,
    isOwner: session?.user?.isOwner,
    isAdmin: session?.user?.isAdmin,
    isTeamMember: session?.user?.isTeamMember,
    hasFinanceAccess: session?.user?.hasFinanceAccess,
    hasHRAccess: session?.user?.hasHRAccess,
    hasOperationsAccess: session?.user?.hasOperationsAccess,
    canApprove: session?.user?.canApprove,
    hasAdminAccess,
    devAuthEnabled,
    willRedirect: !hasAdminAccess && !devAuthEnabled,
  }));

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

  // Get tenant-scoped data
  const tenantId = session?.user?.organizationId;

  let badgeCounts = {
    pendingChangeRequests: 0,
    pendingLeaveRequests: 0,
    pendingSuppliers: 0,
    pendingPurchaseRequests: 0,
    pendingAssetRequests: 0,
    pendingApprovals: 0,
  };
  let orgSettings = { enabledModules: ['assets', 'subscriptions', 'suppliers'], aiChatEnabled: false };

  if (tenantId) {
    const [fetchedBadgeCounts, fetchedOrgSettings] = await Promise.all([
      getBadgeCounts(tenantId),
      getOrgSettings(tenantId),
    ]);

    // Check if organization still exists
    if (!fetchedOrgSettings) {
      // Organization was deleted - redirect to auto-signout page
      redirect('/org-deleted');
    }

    badgeCounts = fetchedBadgeCounts;
    orgSettings = fetchedOrgSettings;
  }

  return (
    <AdminLayoutClient
      badgeCounts={badgeCounts}
      enabledModules={orgSettings.enabledModules}
      aiChatEnabled={orgSettings.aiChatEnabled}
      isAdmin={isAdmin}
      canApprove={session?.user?.canApprove}
      hasFinanceAccess={session?.user?.hasFinanceAccess}
      hasHRAccess={session?.user?.hasHRAccess}
      hasOperationsAccess={session?.user?.hasOperationsAccess}
    >
      {children}
    </AdminLayoutClient>
  );
}
