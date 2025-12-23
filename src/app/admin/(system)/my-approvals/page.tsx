import { Metadata } from 'next';
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role, ApprovalModule } from '@prisma/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, ShoppingCart, Package, Clock } from 'lucide-react';
import { MyApprovalsClient } from './client';

export const metadata: Metadata = {
  title: 'My Approvals | DAMP',
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

async function getPendingApprovals(userId: string, userRole: Role) {
  // Get roles the user can approve for (their own role + delegations)
  const rolesCanApprove: Role[] = userRole === 'ADMIN' ? [] : [userRole];

  // For non-admin users, find active delegations
  if (userRole !== 'ADMIN') {
    const now = new Date();
    const delegations = await prisma.approverDelegation.findMany({
      where: {
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

  // Get all pending steps
  const whereClause = userRole === 'ADMIN'
    ? { status: 'PENDING' as const }
    : {
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

  // Only approver roles and admin can access
  const approverRoles: Role[] = ['ADMIN', 'MANAGER', 'HR_MANAGER', 'FINANCE_MANAGER', 'DIRECTOR'];
  if (!approverRoles.includes(session.user.role)) {
    redirect('/');
  }

  const approvals = await getPendingApprovals(session.user.id, session.user.role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Approvals</h1>
        <p className="text-muted-foreground">
          Review and process pending approval requests
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Pending</CardDescription>
            <CardTitle className="text-3xl">{approvals.counts.total}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Awaiting your action
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Leave Requests</CardDescription>
            <CardTitle className="text-3xl">{approvals.counts.LEAVE_REQUEST}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <FileText className="h-3 w-3" />
              Pending leave approvals
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Purchase Requests</CardDescription>
            <CardTitle className="text-3xl">{approvals.counts.PURCHASE_REQUEST}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <ShoppingCart className="h-3 w-3" />
              Pending purchase approvals
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Asset Requests</CardDescription>
            <CardTitle className="text-3xl">{approvals.counts.ASSET_REQUEST}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Package className="h-3 w-3" />
              Pending asset approvals
            </div>
          </CardContent>
        </Card>
      </div>

      {approvals.counts.total === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium">No pending approvals</p>
            <p className="text-muted-foreground">
              You&apos;re all caught up! New requests will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <MyApprovalsClient
          approvals={approvals.all}
          grouped={approvals.grouped}
        />
      )}
    </div>
  );
}
