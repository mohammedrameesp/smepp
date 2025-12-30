import { Metadata } from 'next';
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { Role } from '@prisma/client';
import { CheckCircle } from 'lucide-react';
import { MyApprovalsClient } from './client';
import Link from 'next/link';
import { PageHeader, PageContent } from '@/components/ui/page-header';

export const metadata: Metadata = {
  title: 'My Approvals | Durj',
  description: 'Pending approval requests',
};

async function getPendingApprovals(tenantId: string) {
  // Fetch pending leave requests
  const pendingLeaveRequests = await prisma.leaveRequest.findMany({
    where: { tenantId, status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, name: true, email: true } },
      leaveType: { select: { name: true } },
    },
  });

  // Fetch pending asset requests
  const pendingAssetRequests = await prisma.assetRequest.findMany({
    where: {
      tenantId,
      status: { in: ['PENDING_ADMIN_APPROVAL', 'PENDING_RETURN_APPROVAL'] },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, name: true, email: true } },
      asset: true,
    },
  });

  // Fetch pending purchase requests
  const pendingPurchaseRequests = await prisma.purchaseRequest.findMany({
    where: { tenantId, status: 'PENDING' },
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
      requester: req.user.name || req.user.email,
      requesterId: req.user.id,
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
      requester: req.user.name || req.user.email,
      requesterId: req.user.id,
      assetName: req.asset ? `${req.asset.brand || ''} ${req.asset.model}`.trim() : 'Unknown Asset',
      assetTag: req.asset?.assetTag,
      type: req.status === 'PENDING_RETURN_APPROVAL' ? 'Return' : 'Request',
      reason: req.reason,
    },
  }));

  const purchaseApprovals = pendingPurchaseRequests.map((req) => ({
    id: req.id,
    entityType: 'PURCHASE_REQUEST' as const,
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
  const all = [...leaveApprovals, ...assetApprovals, ...purchaseApprovals].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return {
    all,
    grouped: {
      LEAVE_REQUEST: leaveApprovals,
      PURCHASE_REQUEST: purchaseApprovals,
      ASSET_REQUEST: assetApprovals,
    },
    counts: {
      LEAVE_REQUEST: leaveApprovals.length,
      PURCHASE_REQUEST: purchaseApprovals.length,
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

  // Only approver roles and admin can access
  const approverRoles: Role[] = ['ADMIN', 'MANAGER', 'HR_MANAGER', 'FINANCE_MANAGER', 'DIRECTOR'];
  if (!approverRoles.includes(session.user.role)) {
    redirect('/');
  }

  const approvals = await getPendingApprovals(session.user.organizationId);

  return (
    <>
      <PageHeader
        title="My Approvals"
        subtitle="Review and process pending approval requests"
      >
        {/* Stats Summary */}
        <div className="flex flex-wrap items-center gap-4 mt-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 rounded-lg">
            <span className="text-amber-400 text-sm font-medium">{approvals.counts.total} total pending</span>
          </div>
          {approvals.counts.LEAVE_REQUEST > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 rounded-lg">
              <span className="text-blue-400 text-sm font-medium">{approvals.counts.LEAVE_REQUEST} leave</span>
            </div>
          )}
          {approvals.counts.PURCHASE_REQUEST > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 rounded-lg">
              <span className="text-emerald-400 text-sm font-medium">{approvals.counts.PURCHASE_REQUEST} purchase</span>
            </div>
          )}
          {approvals.counts.ASSET_REQUEST > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 rounded-lg">
              <span className="text-purple-400 text-sm font-medium">{approvals.counts.ASSET_REQUEST} asset</span>
            </div>
          )}
        </div>
      </PageHeader>

      <PageContent>
        {approvals.counts.total === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-emerald-500" />
            </div>
            <h3 className="font-semibold text-slate-900 text-lg mb-1">All caught up!</h3>
            <p className="text-slate-500 mb-4">No pending approvals at the moment.</p>
            <Link
              href="/admin"
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium"
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
