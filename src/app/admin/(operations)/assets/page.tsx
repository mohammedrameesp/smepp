import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { redirect } from 'next/navigation';
import { Role, AssetRequestStatus } from '@prisma/client';
import Link from 'next/link';
import { AssetListTableServerSearch } from '@/components/assets/asset-list-table-server-search';
import { Package, Plus, DollarSign, Users, Inbox } from 'lucide-react';

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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl p-5 text-white shadow-lg shadow-blue-200/50">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Package className="h-5 w-5" />
              </div>
              <span className="text-3xl font-bold">{totalAssets}</span>
            </div>
            <p className="text-sm font-medium">Total Assets</p>
            <p className="text-xs text-white/70">All registered items</p>
          </div>
        </div>

        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl p-5 text-white shadow-lg shadow-emerald-200/50">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Users className="h-5 w-5" />
              </div>
              <span className="text-3xl font-bold">{assignedAssets}</span>
            </div>
            <p className="text-sm font-medium">Assigned</p>
            <p className="text-xs text-white/70">
              {totalAssets > 0 ? Math.round((assignedAssets / totalAssets) * 100) : 0}% of total
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden bg-gradient-to-br from-purple-400 to-violet-500 rounded-2xl p-5 text-white shadow-lg shadow-purple-200/50">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <DollarSign className="h-5 w-5" />
              </div>
              <span className="text-2xl font-bold">{(totalValueQAR / 1000).toFixed(0)}K</span>
            </div>
            <p className="text-sm font-medium">Total Value</p>
            <p className="text-xs text-white/70">QAR {totalValueQAR.toLocaleString()}</p>
          </div>
        </div>

        <Link href="/admin/asset-requests">
          <div className="relative overflow-hidden bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-5 text-white shadow-lg shadow-orange-200/50 cursor-pointer hover:shadow-xl transition-shadow">
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Inbox className="h-5 w-5" />
                </div>
                <span className="text-3xl font-bold">{totalPendingRequests}</span>
              </div>
              <p className="text-sm font-medium">Pending Requests</p>
              <p className="text-xs text-white/70">{pendingRequests} new, {pendingReturns} returns</p>
            </div>
          </div>
        </Link>
      </div>

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
