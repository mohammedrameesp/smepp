import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { redirect } from 'next/navigation';
import { Role, AssetRequestStatus } from '@prisma/client';
import Link from 'next/link';
import { AssetListTableServerSearch } from '@/components/assets/asset-list-table-server-search';
import { Package, Plus, DollarSign, Users, Inbox } from 'lucide-react';
import { StatsCard, StatsCardGrid } from '@/components/ui/stats-card';

export default async function AdminAssetsPage() {
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

  const [totalUsers, assetStats, assignedCount, pendingRequests, pendingReturns] = await Promise.all([
    prisma.user.count({
      where: { organizationMemberships: { some: { organizationId: tenantId } } },
    }),
    prisma.asset.aggregate({
      where: { tenantId },
      _count: { _all: true },
      _sum: { priceQAR: true },
    }),
    prisma.asset.count({
      where: { tenantId, assignedUserId: { not: null } },
    }),
    prisma.assetRequest.count({
      where: { tenantId, status: AssetRequestStatus.PENDING_ADMIN_APPROVAL },
    }),
    prisma.assetRequest.count({
      where: { tenantId, status: AssetRequestStatus.PENDING_RETURN_APPROVAL },
    }),
  ]);

  const totalAssets = assetStats._count._all;
  const assignedAssets = assignedCount;
  const totalValueQAR = Number(assetStats._sum.priceQAR || 0);
  const totalPendingRequests = pendingRequests + pendingReturns;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Assets</h1>
          <p className="text-slate-500 text-sm">Manage company assets and equipment</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/asset-requests"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Inbox className="h-4 w-4" />
            Requests
            {totalPendingRequests > 0 && (
              <span className="bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {totalPendingRequests}
              </span>
            )}
          </Link>
          <Link
            href="/admin/assets/new"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Asset
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCardGrid columns={4} className="mb-6">
        <StatsCard
          title="Total Assets"
          subtitle="All registered items"
          value={totalAssets}
          icon={Package}
          color="blue"
        />
        <StatsCard
          title="Assigned"
          subtitle={`${totalAssets > 0 ? Math.round((assignedAssets / totalAssets) * 100) : 0}% of total`}
          value={assignedAssets}
          icon={Users}
          color="emerald"
        />
        <StatsCard
          title="Total Value"
          subtitle={`QAR ${totalValueQAR.toLocaleString()}`}
          value={`${(totalValueQAR / 1000).toFixed(0)}K`}
          icon={DollarSign}
          color="purple"
        />
        <StatsCard
          title="Pending Requests"
          subtitle={`${pendingRequests} new, ${pendingReturns} returns`}
          value={totalPendingRequests}
          icon={Inbox}
          color="amber"
          href="/admin/asset-requests"
        />
      </StatsCardGrid>

      {/* Assets Table */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-4 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">All Assets</h2>
          <p className="text-sm text-slate-500">Complete inventory with filters and sorting</p>
        </div>
        <div className="p-4">
          <AssetListTableServerSearch />
        </div>
      </div>
    </div>
  );
}
