import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { AdminLayoutClient } from './layout-client';

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
  const session = await getServerSession(authOptions);

  // PROD-003: Auth bypass only when DEV_AUTH_ENABLED is explicitly set
  // Never bypass auth based on NODE_ENV alone (could be misconfigured in production)
  const devAuthEnabled = process.env.DEV_AUTH_ENABLED === 'true';

  // Redirect unauthenticated users
  if (!session && !devAuthEnabled) {
    redirect('/login');
  }

  // Redirect non-admin users
  // Check TeamMember role (organization users) OR legacy role (super-admins)
  const isAdmin = session?.user?.teamMemberRole === 'ADMIN' ||
                  session?.user?.role === 'ADMIN';
  if (!isAdmin && !devAuthEnabled) {
    redirect('/employee');
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
      // Organization was deleted - redirect to logout with message
      redirect('/api/auth/signout?callbackUrl=/login?error=OrgDeleted');
    }

    badgeCounts = fetchedBadgeCounts;
    orgSettings = fetchedOrgSettings;
  }

  return (
    <AdminLayoutClient
      badgeCounts={badgeCounts}
      enabledModules={orgSettings.enabledModules}
      aiChatEnabled={orgSettings.aiChatEnabled}
      userRole={session?.user?.role as string | undefined}
    >
      {children}
    </AdminLayoutClient>
  );
}
