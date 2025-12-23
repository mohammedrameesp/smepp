import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { redirect } from 'next/navigation';
import { Role, AssetRequestStatus } from '@prisma/client';
import { AssetRequestListTable } from '@/components/domains/operations/asset-requests';

export default async function AdminAssetRequestsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  if (process.env.NODE_ENV !== 'development' && session.user.role !== Role.ADMIN) {
    redirect('/forbidden');
  }

  // Fetch all asset requests with related data
  const requests = await prisma.assetRequest.findMany({
    include: {
      asset: {
        select: {
          id: true,
          assetTag: true,
          model: true,
          brand: true,
          type: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      assignedByUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Calculate stats
  const pendingApproval = requests.filter(r => r.status === AssetRequestStatus.PENDING_ADMIN_APPROVAL);
  const pendingReturn = requests.filter(r => r.status === AssetRequestStatus.PENDING_RETURN_APPROVAL);
  const pendingAcceptance = requests.filter(r => r.status === AssetRequestStatus.PENDING_USER_ACCEPTANCE);
  const totalPending = pendingApproval.length + pendingReturn.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Asset Requests</h1>
                <p className="text-gray-600">
                  Manage asset requests, assignments, and returns
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid md:grid-cols-4 gap-3 mb-6">
              <Card className={pendingApproval.length > 0 ? 'border-yellow-400 bg-yellow-50' : ''}>
                <CardHeader className="pb-1 pt-3 px-4">
                  <CardTitle className="text-xs font-medium text-gray-600">
                    Pending Requests
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-3 px-4">
                  <div className={`text-2xl font-bold ${pendingApproval.length > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>
                    {pendingApproval.length}
                  </div>
                  <p className="text-xs text-gray-500">Employee requests</p>
                </CardContent>
              </Card>

              <Card className={pendingReturn.length > 0 ? 'border-orange-400 bg-orange-50' : ''}>
                <CardHeader className="pb-1 pt-3 px-4">
                  <CardTitle className="text-xs font-medium text-gray-600">
                    Pending Returns
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-3 px-4">
                  <div className={`text-2xl font-bold ${pendingReturn.length > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                    {pendingReturn.length}
                  </div>
                  <p className="text-xs text-gray-500">Return requests</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-1 pt-3 px-4">
                  <CardTitle className="text-xs font-medium text-gray-600">
                    Awaiting User
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-3 px-4">
                  <div className="text-2xl font-bold text-blue-600">
                    {pendingAcceptance.length}
                  </div>
                  <p className="text-xs text-gray-500">User acceptance</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-1 pt-3 px-4">
                  <CardTitle className="text-xs font-medium text-gray-600">
                    Total Requests
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-3 px-4">
                  <div className="text-2xl font-bold text-gray-900">
                    {requests.length}
                  </div>
                  <p className="text-xs text-gray-500">All time</p>
                </CardContent>
              </Card>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Requests ({requests.length})</CardTitle>
              <CardDescription>
                Complete list of asset requests, assignments, and returns
              </CardDescription>
            </CardHeader>
            <CardContent>
              {requests.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-4xl mb-4">📋</div>
                  <p className="text-lg font-medium">No requests yet</p>
                  <p className="text-sm">Asset requests will appear here</p>
                </div>
              ) : (
                <AssetRequestListTable
                  requests={requests}
                  isAdmin={true}
                  showUser={true}
                  basePath="/admin/asset-requests"
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
