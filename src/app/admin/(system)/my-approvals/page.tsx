import { Metadata } from 'next';
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { Role, ApprovalModule } from '@prisma/client';
import { FileText, ShoppingCart, Package, Clock, Inbox, CheckCircle } from 'lucide-react';
import { MyApprovalsClient } from './client';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'My Approvals | SME++',
  description: 'Pending approval requests',
};

const MODULE_CONFIG = {
  LEAVE_REQUEST: {
    label: 'Leave Requests',
    icon: 'FileText',
    href: '/admin/leave/requests',
  },
  PURCHASE_REQUEST: {
    label: 'Purchase Requests',
    icon: 'ShoppingCart',
    href: '/admin/purchase-requests',
  },
  ASSET_REQUEST: {
    label: 'Asset Requests',
    icon: 'Package',
    href: '/admin/assets/requests',
  },
};

async function getPendingApprovals(userId: string, userRole: Role, tenantId: string) {
  // Get roles the user can approve for (their own role + delegations)
  const rolesCanApprove: Role[] = userRole === 'ADMIN' ? [] : [userRole];

  // For non-admin users, find active delegations (tenant-scoped)
  if (userRole !== 'ADMIN') {
    const now = new Date();
    const delegations = await prisma.approverDelegation.findMany({
      where: {
        tenantId,
        delegateeId: userId,
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: {
        delegator: {
          select: { role: true },
        },
      },
    });

    for (const delegation of delegations) {
      if (!rolesCanApprove.includes(delegation.delegator.role)) {
        rolesCanApprove.push(delegation.delegator.role);
      }
    }
  }

  // Get all pending steps (tenant-scoped)
  const whereClause = userRole === 'ADMIN'
    ? { tenantId, status: 'PENDING' as const }
    : {
        tenantId,
        status: 'PENDING' as const,
        requiredRole: { in: rolesCanApprove },
      };

  const allPendingSteps = await prisma.approvalStep.findMany({
    where: whereClause,
    orderBy: [
      { entityType: 'asc' },
      { createdAt: 'desc' },
    ],
  });

  // Filter to only include steps that are the current pending step for their entity
  const stepsByEntity = new Map<string, typeof allPendingSteps>();
  for (const step of allPendingSteps) {
    const key = `${step.entityType}:${step.entityId}`;
    if (!stepsByEntity.has(key)) {
      stepsByEntity.set(key, []);
    }
    stepsByEntity.get(key)!.push(step);
  }

  const currentSteps: typeof allPendingSteps = [];
  for (const steps of stepsByEntity.values()) {
    // Get the step with lowest levelOrder (current step)
    const currentStep = steps.reduce((min, step) =>
      step.levelOrder < min.levelOrder ? step : min
    );
    currentSteps.push(currentStep);
  }

  // Fetch entity details for each step
  const enrichedSteps = await Promise.all(
    currentSteps.map(async (step) => {
      let entityDetails: Record<string, unknown> = {};

      if (step.entityType === 'LEAVE_REQUEST') {
        const leaveRequest = await prisma.leaveRequest.findUnique({
          where: { id: step.entityId },
          include: {
            user: { select: { id: true, name: true, email: true } },
            leaveType: { select: { name: true } },
          },
        });
        if (leaveRequest) {
          entityDetails = {
            requester: leaveRequest.user.name || leaveRequest.user.email,
            requesterId: leaveRequest.user.id,
            type: leaveRequest.leaveType.name,
            startDate: leaveRequest.startDate.toISOString(),
            endDate: leaveRequest.endDate.toISOString(),
            totalDays: leaveRequest.totalDays,
            reason: leaveRequest.reason,
          };
        }
      } else if (step.entityType === 'PURCHASE_REQUEST') {
        const purchaseRequest = await prisma.purchaseRequest.findUnique({
          where: { id: step.entityId },
          include: {
            requester: { select: { id: true, name: true, email: true } },
          },
        });
        if (purchaseRequest) {
          entityDetails = {
            requester: purchaseRequest.requester.name || purchaseRequest.requester.email,
            requesterId: purchaseRequest.requester.id,
            title: purchaseRequest.title,
            totalAmount: purchaseRequest.totalAmount?.toString(),
            currency: purchaseRequest.currency,
            priority: purchaseRequest.priority,
            justification: purchaseRequest.justification,
          };
        }
      } else if (step.entityType === 'ASSET_REQUEST') {
        const assetRequest = await prisma.assetRequest.findUnique({
          where: { id: step.entityId },
          include: {
            user: { select: { id: true, name: true, email: true } },
            asset: true,
          },
        });
        if (assetRequest) {
          entityDetails = {
            requester: assetRequest.user.name || assetRequest.user.email,
            requesterId: assetRequest.user.id,
            assetName: assetRequest.asset ? `${assetRequest.asset.brand || ''} ${assetRequest.asset.model}`.trim() : 'Unknown Asset',
            assetTag: assetRequest.asset?.assetTag,
            type: assetRequest.type,
            reason: assetRequest.reason,
          };
        }
      }

      return {
        id: step.id,
        entityType: step.entityType,
        entityId: step.entityId,
        levelOrder: step.levelOrder,
        requiredRole: step.requiredRole,
        createdAt: step.createdAt.toISOString(),
        entityDetails,
      };
    })
  );

  // Group by module
  const grouped = {
    LEAVE_REQUEST: enrichedSteps.filter((s) => s.entityType === 'LEAVE_REQUEST'),
    PURCHASE_REQUEST: enrichedSteps.filter((s) => s.entityType === 'PURCHASE_REQUEST'),
    ASSET_REQUEST: enrichedSteps.filter((s) => s.entityType === 'ASSET_REQUEST'),
  };

  return {
    all: enrichedSteps,
    grouped,
    counts: {
      LEAVE_REQUEST: grouped.LEAVE_REQUEST.length,
      PURCHASE_REQUEST: grouped.PURCHASE_REQUEST.length,
      ASSET_REQUEST: grouped.ASSET_REQUEST.length,
      total: enrichedSteps.length,
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

  const approvals = await getPendingApprovals(session.user.id, session.user.role, session.user.organizationId);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">My Approvals</h1>
        <p className="text-slate-500 text-sm">Review and process pending approval requests</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Total Pending */}
        <div className="relative overflow-hidden bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-5 text-white shadow-lg shadow-orange-200/50">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Inbox className="h-5 w-5" />
              </div>
              <span className="text-3xl font-bold">{approvals.counts.total}</span>
            </div>
            <p className="text-sm font-medium">Total Pending</p>
            <p className="text-xs text-white/70">Awaiting your action</p>
          </div>
        </div>

        {/* Leave Requests */}
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl p-5 text-white shadow-lg shadow-blue-200/50">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <FileText className="h-5 w-5" />
              </div>
              <span className="text-3xl font-bold">{approvals.counts.LEAVE_REQUEST}</span>
            </div>
            <p className="text-sm font-medium">Leave Requests</p>
            <p className="text-xs text-white/70">Pending leave approvals</p>
          </div>
        </div>

        {/* Purchase Requests */}
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl p-5 text-white shadow-lg shadow-emerald-200/50">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <ShoppingCart className="h-5 w-5" />
              </div>
              <span className="text-3xl font-bold">{approvals.counts.PURCHASE_REQUEST}</span>
            </div>
            <p className="text-sm font-medium">Purchase Requests</p>
            <p className="text-xs text-white/70">Pending purchase approvals</p>
          </div>
        </div>

        {/* Asset Requests */}
        <div className="relative overflow-hidden bg-gradient-to-br from-purple-400 to-violet-500 rounded-2xl p-5 text-white shadow-lg shadow-purple-200/50">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Package className="h-5 w-5" />
              </div>
              <span className="text-3xl font-bold">{approvals.counts.ASSET_REQUEST}</span>
            </div>
            <p className="text-sm font-medium">Asset Requests</p>
            <p className="text-xs text-white/70">Pending asset approvals</p>
          </div>
        </div>
      </div>

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
    </div>
  );
}
