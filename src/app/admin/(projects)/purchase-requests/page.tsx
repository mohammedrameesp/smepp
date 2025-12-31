import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import { PurchaseRequestListTable } from '@/components/purchase-requests';
import { PageHeader, PageContent } from '@/components/ui/page-header';

export default async function AdminPurchaseRequestsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  if (process.env.NODE_ENV !== 'development' && session.user.role !== Role.ADMIN) {
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
        {/* Stats Summary */}
        <div className="flex flex-wrap items-center gap-4 mt-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 rounded-lg">
            <span className="text-blue-400 text-sm font-medium">{totalRequests} total</span>
          </div>
          {pendingRequests > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 rounded-lg">
              <span className="text-amber-400 text-sm font-medium">{pendingRequests} pending</span>
            </div>
          )}
          {underReviewRequests > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/20 rounded-lg">
              <span className="text-cyan-400 text-sm font-medium">{underReviewRequests} under review</span>
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 rounded-lg">
            <span className="text-emerald-400 text-sm font-medium">{approvedRequests} approved</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 rounded-lg">
            <span className="text-purple-400 text-sm font-medium">{completedRequests} completed</span>
          </div>
          {totalApprovedAmount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 rounded-lg">
              <span className="text-emerald-400 text-sm font-medium">QAR {totalApprovedAmount.toLocaleString()} approved</span>
            </div>
          )}
        </div>
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
