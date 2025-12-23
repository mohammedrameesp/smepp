import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import { PurchaseRequestListTable } from '@/components/purchase-requests/PurchaseRequestListTable';

export default async function AdminPurchaseRequestsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  if (process.env.NODE_ENV !== 'development' && session.user.role !== Role.ADMIN) {
    redirect('/forbidden');
  }

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
    prisma.purchaseRequest.count(),
    prisma.purchaseRequest.count({ where: { status: 'PENDING' } }),
    prisma.purchaseRequest.count({ where: { status: 'APPROVED' } }),
    prisma.purchaseRequest.count({ where: { status: 'REJECTED' } }),
    prisma.purchaseRequest.count({ where: { status: 'UNDER_REVIEW' } }),
    prisma.purchaseRequest.count({ where: { status: 'COMPLETED' } }),
    prisma.purchaseRequest.aggregate({
      where: { status: { in: ['APPROVED', 'COMPLETED'] } },
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
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Purchase Requests</h1>
              <p className="text-gray-600">
                Review and manage all purchase requests from employees
              </p>
            </div>
          </div>

          {/* Key Figures */}
          <div className="grid md:grid-cols-6 gap-3 mb-6">
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

            <Card className="border-blue-200 bg-blue-50">
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-medium text-blue-700">Under Review</CardTitle>
              </CardHeader>
              <CardContent className="pb-3 px-4">
                <div className="text-2xl font-bold text-blue-700">{underReviewRequests}</div>
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

            <Card className="border-gray-200 bg-gray-50">
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-medium text-gray-700">Completed</CardTitle>
              </CardHeader>
              <CardContent className="pb-3 px-4">
                <div className="text-2xl font-bold text-gray-700">{completedRequests}</div>
              </CardContent>
            </Card>
          </div>

          {/* Total Approved Amount */}
          <Card className="mb-6">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Approved/Completed Amount</p>
                  <p className="text-2xl font-bold text-green-600">QAR {formatAmount(totalApprovedAmount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Purchase Requests</CardTitle>
            <CardDescription>
              View, review, and manage all employee purchase requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PurchaseRequestListTable isAdmin={true} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
