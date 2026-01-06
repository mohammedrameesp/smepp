import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { Button } from '@/components/ui/button';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus, FileText, Clock, CheckCircle, XCircle } from 'lucide-react';
import { PurchaseRequestListTable } from '@/components/domains/projects/purchase-requests';
import { PageHeader, PageContent } from '@/components/ui/page-header';

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
    <>
      <PageHeader
        title="My Purchase Requests"
        subtitle="Submit and track your purchase requests"
        breadcrumbs={[
          { label: 'Dashboard', href: '/employee' },
          { label: 'Purchase Requests' }
        ]}
        actions={
          <Link href="/employee/purchase-requests/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Request
            </Button>
          </Link>
        }
      >
        <div className="flex flex-wrap items-center gap-4 mt-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-500/20 rounded-lg">
            <FileText className="h-4 w-4 text-slate-400" />
            <span className="text-slate-400 text-sm font-medium">
              {totalRequests} total requests
            </span>
          </div>
          {pendingRequests > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 rounded-lg">
              <Clock className="h-4 w-4 text-amber-400" />
              <span className="text-amber-400 text-sm font-medium">
                {pendingRequests} pending
              </span>
            </div>
          )}
          {approvedRequests > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 rounded-lg">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              <span className="text-emerald-400 text-sm font-medium">
                {approvedRequests} approved
              </span>
            </div>
          )}
          {rejectedRequests > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/20 rounded-lg">
              <XCircle className="h-4 w-4 text-rose-400" />
              <span className="text-rose-400 text-sm font-medium">
                {rejectedRequests} rejected
              </span>
            </div>
          )}
        </div>
      </PageHeader>

      <PageContent>
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <FileText className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">My Requests</h2>
              <p className="text-sm text-slate-500">All purchase requests you have submitted</p>
            </div>
          </div>
          <div className="p-5">
            <PurchaseRequestListTable isAdmin={false} />
          </div>
        </div>
      </PageContent>
    </>
  );
}
