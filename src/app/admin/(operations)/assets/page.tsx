import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { redirect } from 'next/navigation';
import { Role, AssetRequestStatus } from '@prisma/client';
import Link from 'next/link';
import { AssetListTableServerSearch } from '@/components/assets/asset-list-table-server-search';

export default async function AdminAssetsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  if (process.env.NODE_ENV !== 'development' && session.user.role !== Role.ADMIN) {
    redirect('/forbidden');
  }

  // Require organization context for tenant isolation
  if (!session.user.organizationId) {
    redirect('/login');
  }

  const tenantId = session.user.organizationId;

  // Fetch stats only (not all assets - the table component fetches its own data) - tenant-scoped
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

  // Calculate key figures
  const totalAssets = assetStats._count._all;
  const assignedAssets = assignedCount;
  const totalValueQAR = Number(assetStats._sum.priceQAR || 0);
  const totalPendingRequests = pendingRequests + pendingReturns;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Manage Assets</h1>
                <p className="text-gray-600">
                  View, edit, and manage all company assets
                </p>
              </div>
              <div className="flex gap-2">
                <Link href="/admin/asset-requests">
                  <Button variant="outline">
                    View Requests
                    {totalPendingRequests > 0 && (
                      <span className="ml-2 bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full">
                        {totalPendingRequests}
                      </span>
                    )}
                  </Button>
                </Link>
                <Link href="/admin/assets/new">
                  <Button>+ Add Asset</Button>
                </Link>
              </div>
            </div>

            {/* Key Figures */}
            <div className="grid md:grid-cols-4 gap-3 mb-6">
              <Card>
                <CardHeader className="pb-1 pt-3 px-4">
                  <CardTitle className="text-xs font-medium text-gray-600">Total Assets</CardTitle>
                </CardHeader>
                <CardContent className="pb-3 px-4">
                  <div className="text-2xl font-bold text-gray-900">{totalAssets}</div>
                  <p className="text-xs text-gray-500">All registered assets</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-1 pt-3 px-4">
                  <CardTitle className="text-xs font-medium text-gray-600">Assigned to Users</CardTitle>
                </CardHeader>
                <CardContent className="pb-3 px-4">
                  <div className="text-2xl font-bold text-gray-900">
                    {assignedAssets}
                    <span className="text-lg text-gray-500 ml-1">/{totalAssets}</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {totalAssets > 0 ? Math.round((assignedAssets / totalAssets) * 100) : 0}% assigned to {totalUsers} users
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-1 pt-3 px-4">
                  <CardTitle className="text-xs font-medium text-gray-600">Total Value</CardTitle>
                </CardHeader>
                <CardContent className="pb-3 px-4">
                  <div className="text-2xl font-bold text-gray-900">
                    QAR {totalValueQAR.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </div>
                  <p className="text-xs text-gray-500">Combined asset value</p>
                </CardContent>
              </Card>

              <Link href="/admin/asset-requests">
                <Card className={`cursor-pointer hover:shadow-lg transition-all ${totalPendingRequests > 0 ? 'border-yellow-400 bg-yellow-50' : ''}`}>
                  <CardHeader className="pb-1 pt-3 px-4">
                    <CardTitle className="text-xs font-medium text-gray-600">Pending Requests</CardTitle>
                  </CardHeader>
                  <CardContent className="pb-3 px-4">
                    <div className={`text-2xl font-bold ${totalPendingRequests > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>
                      {totalPendingRequests}
                    </div>
                    <p className="text-xs text-gray-500">
                      {pendingRequests} requests, {pendingReturns} returns
                    </p>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Assets</CardTitle>
              <CardDescription>
                Complete list of registered assets with filters and sorting
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AssetListTableServerSearch />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}