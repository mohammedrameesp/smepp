import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { AdminLayoutClient } from './layout-client';

// Get enabled modules from database (fresh, not from session)
async function getEnabledModules(tenantId: string): Promise<string[]> {
  const org = await prisma.organization.findUnique({
    where: { id: tenantId },
    select: { enabledModules: true },
  });
  return org?.enabledModules?.length ? org.enabledModules : ['assets', 'subscriptions', 'suppliers'];
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

  // Redirect unauthenticated users
  if (!session && process.env.NODE_ENV !== 'development') {
    redirect('/login');
  }

  // Redirect non-admin users
  if (session?.user?.role !== 'ADMIN' && process.env.NODE_ENV !== 'development') {
    redirect('/employee');
  }

  // Get tenant-scoped data
  const tenantId = session?.user?.organizationId;
  const [badgeCounts, enabledModules] = tenantId
    ? await Promise.all([
        getBadgeCounts(tenantId),
        getEnabledModules(tenantId),
      ])
    : [
        {
          pendingChangeRequests: 0,
          pendingLeaveRequests: 0,
          pendingSuppliers: 0,
          pendingPurchaseRequests: 0,
          pendingAssetRequests: 0,
          pendingApprovals: 0,
        },
        ['assets', 'subscriptions', 'suppliers'],
      ];

  return <AdminLayoutClient badgeCounts={badgeCounts} enabledModules={enabledModules}>{children}</AdminLayoutClient>;
}
