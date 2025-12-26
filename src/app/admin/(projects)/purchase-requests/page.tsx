import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import { PurchaseRequestListTable } from '@/components/purchase-requests/PurchaseRequestListTable';
import { ShoppingCart, Clock, Search, CheckCircle, XCircle, Package, DollarSign } from 'lucide-react';
import { StatsCard, StatsCardGrid } from '@/components/ui/stats-card';

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
    rejectedRequests,
    underReviewRequests,
    completedRequests,
    totalAmountResult,
  ] = await Promise.all([
    prisma.purchaseRequest.count({ where: { tenantId } }),
    prisma.purchaseRequest.count({ where: { tenantId, status: 'PENDING' } }),
    prisma.purchaseRequest.count({ where: { tenantId, status: 'APPROVED' } }),
    prisma.purchaseRequest.count({ where: { tenantId, status: 'REJECTED' } }),
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

  // Format amount
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-QA', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Purchase Requests</h1>
        <p className="text-slate-500 text-sm">Review and manage all purchase requests from employees</p>
      </div>

      {/* Stats Cards */}
      <StatsCardGrid columns={6} className="mb-6">
        <StatsCard
          title="Total"
          subtitle="All requests"
          value={totalRequests}
          icon={ShoppingCart}
          color="blue"
        />
        <StatsCard
          title="Pending"
          subtitle="Awaiting review"
          value={pendingRequests}
          icon={Clock}
          color="amber"
        />
        <StatsCard
          title="Under Review"
          subtitle="Being processed"
          value={underReviewRequests}
          icon={Search}
          color="cyan"
        />
        <StatsCard
          title="Approved"
          subtitle="Ready to order"
          value={approvedRequests}
          icon={CheckCircle}
          color="emerald"
        />
        <StatsCard
          title="Rejected"
          subtitle="Not approved"
          value={rejectedRequests}
          icon={XCircle}
          color="rose"
        />
        <StatsCard
          title="Completed"
          subtitle="Delivered"
          value={completedRequests}
          icon={Package}
          color="purple"
        />
      </StatsCardGrid>

      {/* Total Approved Amount */}
      <StatsCard
        title="Total Approved/Completed Amount"
        subtitle=""
        value={`QAR ${formatAmount(totalApprovedAmount)}`}
        icon={DollarSign}
        color="green"
        className="mb-6"
      />

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
    </div>
  );
}
