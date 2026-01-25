import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { HelpLayoutClient } from './layout-client';
import type { UserRole } from '@/lib/help/help-types';
import type { Metadata } from 'next';

// Dynamic page titles with organization name
export async function generateMetadata(): Promise<Metadata> {
  const session = await getServerSession(authOptions);
  const orgName = session?.user?.organizationName || 'Durj';

  return {
    title: {
      template: `%s | ${orgName}`,
      default: `Help | ${orgName}`,
    },
  };
}

// Get enabled modules from database
async function getEnabledModules(tenantId: string): Promise<string[]> {
  const org = await prisma.organization.findUnique({
    where: { id: tenantId },
    select: { enabledModules: true },
  });
  return org?.enabledModules?.length ? org.enabledModules : ['assets', 'subscriptions', 'suppliers'];
}

// Get badge counts with tenant filtering (same as admin layout)
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

export default async function HelpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  // Redirect unauthenticated users
  if (!session && process.env.NODE_ENV !== 'development') {
    redirect('/login');
  }

  // Determine user role for content filtering
  const isAdmin = !!(session?.user?.isOwner || session?.user?.isAdmin);
  const userRole: UserRole = isAdmin ? 'ADMIN' : 'USER';

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
          pendingSpendRequests: 0,
          pendingAssetRequests: 0,
          pendingApprovals: 0,
        },
        ['assets', 'subscriptions', 'suppliers'],
      ];

  // Get user info for display
  const userName = session?.user?.name || 'User';
  const userEmail = session?.user?.email || '';

  return (
    <HelpLayoutClient
      userRole={userRole}
      isAdmin={isAdmin}
      enabledModules={enabledModules}
      badgeCounts={badgeCounts}
      userName={userName}
      userEmail={userEmail}
    >
      {children}
    </HelpLayoutClient>
  );
}
