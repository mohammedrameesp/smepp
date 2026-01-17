import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { redirect } from 'next/navigation';

import { PurchaseRequestListTable } from '@/features/purchase-requests/components';
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { StatChip, StatChipGroup } from '@/components/ui/stat-chip';

export default async function AdminPurchaseRequestsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // Allow access for admins OR users with Finance access
  const hasAccess = session.user.isAdmin || session.user.hasFinanceAccess;
  if (process.env.NODE_ENV !== 'development' && !hasAccess) {
    redirect('/forbidden');
  }

  if (!session.user.organizationId) {
    redirect('/login');
  }

  const tenantId = session.user.organizationId;

  // Fetch statistics
  const [
    totalRequests,
    pendingRequests,
    approvedRequests,
    underReviewRequests,
    completedRequests,
    totalAmountResult,
  ] = await Promise.all([
    prisma.purchaseRequest.count({ where: { tenantId } }),
    prisma.purchaseRequest.count({ where: { tenantId, status: 'PENDING' } }),
    prisma.purchaseRequest.count({ where: { tenantId, status: 'APPROVED' } }),
    prisma.purchaseRequest.count({ where: { tenantId, status: 'UNDER_REVIEW' } }),
    prisma.purchaseRequest.count({ where: { tenantId, status: 'COMPLETED' } }),
    prisma.purchaseRequest.aggregate({
      where: { tenantId, status: { in: ['APPROVED', 'COMPLETED'] } },
      _sum: { totalAmountQAR: true },
    }),
  ]);

  const totalApprovedAmount = totalAmountResult._sum.totalAmountQAR
    ? Number(totalAmountResult._sum.totalAmountQAR)
    : 0;

  return (
    <>
      <PageHeader
        title="Purchase Requests"
        subtitle="Review and manage all purchase requests from employees"
      >
        <StatChipGroup>
          <StatChip value={totalRequests} label="total" color="blue" />
          <StatChip value={pendingRequests} label="pending" color="amber" hideWhenZero />
          <StatChip value={underReviewRequests} label="under review" color="cyan" hideWhenZero />
          <StatChip value={approvedRequests} label="approved" color="emerald" />
          <StatChip value={completedRequests} label="completed" color="purple" />
          <StatChip
            value={`QAR ${totalApprovedAmount.toLocaleString()}`}
            label="approved value"
            color="emerald"
            hideWhenZero
          />
        </StatChipGroup>
      </PageHeader>

      <PageContent>
        {/* Requests Table */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-4 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">All Purchase Requests</h2>
            <p className="text-sm text-slate-500">View, review, and manage all employee purchase requests</p>
          </div>
          <div className="p-4">
            <PurchaseRequestListTable isAdmin={true} />
          </div>
        </div>
      </PageContent>
    </>
  );
}
