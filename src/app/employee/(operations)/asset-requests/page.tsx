import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AssetRequestListTable } from '@/components/domains/operations/asset-requests';
import { PendingAssignmentsAlert } from '@/components/domains/operations/asset-requests';

export default async function EmployeeAssetRequestsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // Fetch user's asset requests
  const requests = await prisma.assetRequest.findMany({
    where: {
      userId: session.user.id,
    },
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
  const pendingAssignments = requests.filter(r => r.status === 'PENDING_USER_ACCEPTANCE');
  const pendingRequests = requests.filter(r =>
    r.status === 'PENDING_ADMIN_APPROVAL' || r.status === 'PENDING_RETURN_APPROVAL'
  );
  const completedRequests = requests.filter(r =>
    r.status === 'ACCEPTED' || r.status === 'APPROVED' ||
    r.status === 'REJECTED' || r.status === 'REJECTED_BY_USER'
  );

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">My Asset Requests</h1>
              <p className="text-gray-600">
                View and manage your asset requests and assignments
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/employee/assets">
                <Button variant="outline">Browse Assets</Button>
              </Link>
              <Link href="/">
                <Button variant="outline">Back to Home</Button>
              </Link>
            </div>
          </div>

          {/* Pending Assignments Alert */}
          <PendingAssignmentsAlert />

          {/* Stats */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card className={pendingAssignments.length > 0 ? 'border-yellow-400 bg-yellow-50' : ''}>
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Pending Acceptance
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4 px-5">
                <div className={`text-3xl font-bold ${pendingAssignments.length > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>
                  {pendingAssignments.length}
                </div>
                <p className="text-sm text-gray-500">Awaiting your response</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Pending Approval
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4 px-5">
                <div className="text-3xl font-bold text-blue-600">
                  {pendingRequests.length}
                </div>
                <p className="text-sm text-gray-500">Waiting for admin</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total Requests
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4 px-5">
                <div className="text-3xl font-bold text-gray-600">
                  {requests.length}
                </div>
                <p className="text-sm text-gray-500">All time</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Requests List */}
        <Card>
          <CardHeader>
            <CardTitle>All Requests ({requests.length})</CardTitle>
            <CardDescription>
              Your asset requests, assignments, and return requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            {requests.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-4">📋</div>
                <p className="text-lg font-medium">No requests yet</p>
                <p className="text-sm mb-4">
                  Browse available assets to submit a request
                </p>
                <Link href="/employee/assets">
                  <Button>Browse Assets</Button>
                </Link>
              </div>
            ) : (
              <AssetRequestListTable
                requests={requests}
                showUser={false}
                basePath="/employee/asset-requests"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
