import { Metadata } from 'next';
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { CheckCircle, Inbox } from 'lucide-react';
import { MyApprovalsClient } from './client';
import Link from 'next/link';
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { StatChip, StatChipGroup } from '@/components/ui/stat-chip';

// Admins and Managers can approve requests
// - isAdmin: Full access to all approvals
// - canApprove (isManager): Can approve direct reports' requests

export const metadata: Metadata = {
  title: 'My Approvals | Durj',
  description: 'Pending approval requests',
};

async function getPendingApprovals(tenantId: string, userId: string, isAdmin: boolean) {
  // For managers (non-admins), get their direct reports' IDs
  let directReportIds: string[] = [];
  if (!isAdmin) {
    const directReports = await prisma.teamMember.findMany({
      where: { tenantId, reportingToId: userId },
      select: { id: true },
    });
    directReportIds = directReports.map(r => r.id);

    // If manager has no direct reports, return empty
    if (directReportIds.length === 0) {
      return {
        all: [],
        grouped: { LEAVE_REQUEST: [], SPEND_REQUEST: [], ASSET_REQUEST: [] },
        counts: { LEAVE_REQUEST: 0, SPEND_REQUEST: 0, ASSET_REQUEST: 0, total: 0 },
      };
    }
  }

  // Build where clause - admins see all, managers see only direct reports
  const memberFilter = isAdmin ? {} : { memberId: { in: directReportIds } };
  const requesterFilter = isAdmin ? {} : { requesterId: { in: directReportIds } };

  // Fetch pending leave requests
  const pendingLeaveRequests = await prisma.leaveRequest.findMany({
    where: { tenantId, status: 'PENDING', ...memberFilter },
    orderBy: { createdAt: 'desc' },
    include: {
      member: { select: { id: true, name: true, email: true } },
      leaveType: { select: { name: true } },
    },
  });

  // Fetch pending asset requests
  const pendingAssetRequests = await prisma.assetRequest.findMany({
    where: {
      tenantId,
      status: { in: ['PENDING_ADMIN_APPROVAL', 'PENDING_RETURN_APPROVAL'] },
      ...memberFilter,
    },
    orderBy: { createdAt: 'desc' },
    include: {
      member: { select: { id: true, name: true, email: true } },
      asset: true,
    },
  });

  // Fetch pending spend requests
  const pendingSpendRequests = await prisma.spendRequest.findMany({
    where: { tenantId, status: 'PENDING', ...requesterFilter },
    orderBy: { createdAt: 'desc' },
    include: {
      requester: { select: { id: true, name: true, email: true } },
    },
  });

  // Transform to common format
  const leaveApprovals = pendingLeaveRequests.map((req) => ({
    id: req.id,
    entityType: 'LEAVE_REQUEST' as const,
    entityId: req.id,
    createdAt: req.createdAt.toISOString(),
    entityDetails: {
      requester: req.member?.name || req.member?.email || 'Unknown',
      requesterId: req.member?.id || '',
      type: req.leaveType.name,
      startDate: req.startDate.toISOString(),
      endDate: req.endDate.toISOString(),
      totalDays: req.totalDays,
      reason: req.reason,
    },
  }));

  const assetApprovals = pendingAssetRequests.map((req) => ({
    id: req.id,
    entityType: 'ASSET_REQUEST' as const,
    entityId: req.id,
    createdAt: req.createdAt.toISOString(),
    entityDetails: {
      requester: req.member?.name || req.member?.email || 'Unknown',
      requesterId: req.member?.id || '',
      assetName: req.asset ? `${req.asset.brand || ''} ${req.asset.model}`.trim() : 'Unknown Asset',
      assetTag: req.asset?.assetTag,
      type: req.status === 'PENDING_RETURN_APPROVAL' ? 'Return' : 'Request',
      reason: req.reason,
    },
  }));

  const spendApprovals = pendingSpendRequests.map((req) => ({
    id: req.id,
    entityType: 'SPEND_REQUEST' as const,
    entityId: req.id,
    createdAt: req.createdAt.toISOString(),
    entityDetails: {
      requester: req.requester.name || req.requester.email,
      requesterId: req.requester.id,
      title: req.title,
      totalAmount: req.totalAmount?.toString(),
      currency: req.currency,
      priority: req.priority,
      justification: req.justification,
    },
  }));

  // Combine and sort by date
  const all = [...leaveApprovals, ...assetApprovals, ...spendApprovals].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return {
    all,
    grouped: {
      LEAVE_REQUEST: leaveApprovals,
      SPEND_REQUEST: spendApprovals,
      ASSET_REQUEST: assetApprovals,
    },
    counts: {
      LEAVE_REQUEST: leaveApprovals.length,
      SPEND_REQUEST: spendApprovals.length,
      ASSET_REQUEST: assetApprovals.length,
      total: all.length,
    },
  };
}

export default async function MyApprovalsPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/');
  }

  // Require organization context for tenant isolation
  if (!session.user.organizationId) {
    redirect('/');
  }

  // Allow access if user is an admin OR a manager (canApprove)
  const canAccessApprovals = session.user.isAdmin || session.user.canApprove;
  if (!canAccessApprovals) {
    redirect('/admin');
  }

  const approvals = await getPendingApprovals(
    session.user.organizationId,
    session.user.id,
    session.user.isAdmin || false
  );

  return (
    <>
      <PageHeader
        title="My Approvals"
        subtitle="Review and process pending approval requests"
      >
        <StatChipGroup>
          <StatChip value={approvals.counts.total} label="total pending" color="amber" />
          <StatChip value={approvals.counts.LEAVE_REQUEST} label="leave" color="blue" hideWhenZero />
          <StatChip value={approvals.counts.SPEND_REQUEST} label="spend" color="emerald" hideWhenZero />
          <StatChip value={approvals.counts.ASSET_REQUEST} label="asset" color="purple" hideWhenZero />
        </StatChipGroup>
      </PageHeader>

      <PageContent>
        {approvals.counts.total === 0 ? (
          <div className="bg-gradient-to-b from-white to-emerald-50/30 rounded-2xl border border-slate-200 p-12 text-center">
            <div className="relative inline-block mb-6">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="h-10 w-10 text-emerald-500" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-full border-2 border-emerald-200 flex items-center justify-center">
                <Inbox className="h-4 w-4 text-emerald-500" />
              </div>
            </div>
            <h3 className="font-semibold text-slate-900 text-xl mb-2">All caught up!</h3>
            <p className="text-slate-500 mb-6 max-w-sm mx-auto">
              Great job! You have no pending approvals at the moment. New requests will appear here.
            </p>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-full text-sm font-medium hover:bg-slate-800 transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        ) : (
          <MyApprovalsClient
            approvals={approvals.all}
            grouped={approvals.grouped}
          />
        )}
      </PageContent>
    </>
  );
}
