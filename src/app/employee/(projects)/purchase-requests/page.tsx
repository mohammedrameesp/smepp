import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { PurchaseRequestListTable } from '@/components/purchase-requests';

export default async function EmployeePurchaseRequestsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // Fetch statistics for current user only
  const [
    totalRequests,
    pendingRequests,
    approvedRequests,
    rejectedRequests,
  ] = await Promise.all([
    prisma.purchaseRequest.count({ where: { requesterId: session.user.id } }),
    prisma.purchaseRequest.count({ where: { requesterId: session.user.id, status: 'PENDING' } }),
    prisma.purchaseRequest.count({ where: { requesterId: session.user.id, status: 'APPROVED' } }),
    prisma.purchaseRequest.count({ where: { requesterId: session.user.id, status: 'REJECTED' } }),
  ]);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">My Purchase Requests</h1>
              <p className="text-gray-600">
                Submit and track your purchase requests
              </p>
            </div>
            <Link href="/employee/purchase-requests/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Request
              </Button>
            </Link>
          </div>

          {/* Key Figures */}
          <div className="grid md:grid-cols-4 gap-3 mb-6">
            <Card>
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-medium text-gray-600">Total Requests</CardTitle>
              </CardHeader>
              <CardContent className="pb-3 px-4">
                <div className="text-2xl font-bold text-gray-900">{totalRequests}</div>
              </CardContent>
            </Card>

            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-medium text-yellow-700">Pending</CardTitle>
              </CardHeader>
              <CardContent className="pb-3 px-4">
                <div className="text-2xl font-bold text-yellow-700">{pendingRequests}</div>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-green-50">
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-medium text-green-700">Approved</CardTitle>
              </CardHeader>
              <CardContent className="pb-3 px-4">
                <div className="text-2xl font-bold text-green-700">{approvedRequests}</div>
              </CardContent>
            </Card>

            <Card className="border-red-200 bg-red-50">
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-medium text-red-700">Rejected</CardTitle>
              </CardHeader>
              <CardContent className="pb-3 px-4">
                <div className="text-2xl font-bold text-red-700">{rejectedRequests}</div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>My Requests</CardTitle>
            <CardDescription>
              All purchase requests you have submitted
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PurchaseRequestListTable isAdmin={false} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
