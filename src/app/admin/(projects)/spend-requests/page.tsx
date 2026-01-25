import { prisma } from '@/lib/core/prisma';
import { redirect } from 'next/navigation';
import { getAdminAuthContext, hasAccess } from '@/lib/auth/impersonation-check';

import { SpendRequestListClient } from '@/features/spend-requests/components';
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { StatChip, StatChipGroup } from '@/components/ui/stat-chip';

export default async function AdminSpendRequestsPage() {
  const auth = await getAdminAuthContext();

  // If not impersonating and no session, redirect to login
  if (!auth.isImpersonating && !auth.session) {
    redirect('/login');
  }

  // Check access (any admin can access spend requests)
  if (!hasAccess(auth)) {
    redirect('/forbidden');
  }

  if (!auth.tenantId) {
    redirect('/login');
  }

  const tenantId = auth.tenantId;

  // Fetch statistics
  const [
    totalRequests,
    pendingRequests,
    approvedRequests,
    underReviewRequests,
    completedRequests,
    totalAmountResult,
  ] = await Promise.all([
    prisma.spendRequest.count({ where: { tenantId } }),
    prisma.spendRequest.count({ where: { tenantId, status: 'PENDING' } }),
    prisma.spendRequest.count({ where: { tenantId, status: 'APPROVED' } }),
    prisma.spendRequest.count({ where: { tenantId, status: 'UNDER_REVIEW' } }),
    prisma.spendRequest.count({ where: { tenantId, status: 'COMPLETED' } }),
    prisma.spendRequest.aggregate({
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
        title="Spend Requests"
        subtitle="Review and manage all spend requests from employees"
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
            <h2 className="font-semibold text-slate-900">All Spend Requests</h2>
            <p className="text-sm text-slate-500">View, review, and manage all employee spend requests</p>
          </div>
          <div className="p-4">
            <SpendRequestListClient isAdmin={true} />
          </div>
        </div>
      </PageContent>
    </>
  );
}
