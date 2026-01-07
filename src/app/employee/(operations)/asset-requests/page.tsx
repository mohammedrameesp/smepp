/**
 * @file page.tsx
 * @description Employee asset requests page - view and manage personal asset requests
 * @module app/employee/(operations)/asset-requests
 *
 * Features:
 * - Personal request history (only current user's requests)
 * - Pending acceptance card with action needed highlight
 * - Pending approval count (waiting for admin)
 * - Total requests count
 * - Alert banner for assets pending acceptance via PendingAssignmentsAlert
 * - Request table with status filters
 * - Link to browse available assets
 *
 * Request Categories Displayed:
 * - Pending Acceptance: Assets assigned by admin awaiting user response
 * - Pending Approval: User's requests waiting for admin decision
 * - Completed: Approved, rejected, or accepted requests
 *
 * Access: All authenticated employees (filtered by current user)
 * Route: /employee/asset-requests
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { Button } from '@/components/ui/button';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Package, Clock, FileText, AlertCircle } from 'lucide-react';
import { AssetRequestListTable } from '@/features/asset-requests';
import { PendingAssignmentsAlert } from '@/features/asset-requests';
import { PageHeader, PageContent } from '@/components/ui/page-header';

/**
 * Employee asset requests page component
 * Displays personal request history with pending action highlights
 */
export default async function EmployeeAssetRequestsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // Fetch user's asset requests
  const requests = await prisma.assetRequest.findMany({
    where: {
      memberId: session.user.id,
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
      member: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      assignedByMember: {
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
    <>
      <PageHeader
        title="My Asset Requests"
        subtitle="View and manage your asset requests and assignments"
        breadcrumbs={[
          { label: 'Dashboard', href: '/employee' },
          { label: 'My Assets', href: '/employee/my-assets' },
          { label: 'Requests' }
        ]}
        actions={
          <div className="flex gap-2">
            <Link href="/employee/assets">
              <Button variant="outline">Browse Assets</Button>
            </Link>
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-4 mt-4">
          {pendingAssignments.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 rounded-lg">
              <AlertCircle className="h-4 w-4 text-amber-400" />
              <span className="text-amber-400 text-sm font-medium">
                {pendingAssignments.length} pending acceptance
              </span>
            </div>
          )}
          {pendingRequests.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 rounded-lg">
              <Clock className="h-4 w-4 text-blue-400" />
              <span className="text-blue-400 text-sm font-medium">
                {pendingRequests.length} pending approval
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-500/20 rounded-lg">
            <FileText className="h-4 w-4 text-slate-400" />
            <span className="text-slate-400 text-sm font-medium">
              {requests.length} total requests
            </span>
          </div>
        </div>
      </PageHeader>

      <PageContent>
        {/* Pending Assignments Alert */}
        <PendingAssignmentsAlert />

        {/* Requests List */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Package className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">All Requests ({requests.length})</h2>
              <p className="text-sm text-slate-500">Your asset requests, assignments, and return requests</p>
            </div>
          </div>
          <div className="p-5">
            {requests.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📋</div>
                <p className="text-lg font-medium text-slate-900">No requests yet</p>
                <p className="text-sm text-slate-500 mb-4">
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
          </div>
        </div>
      </PageContent>
    </>
  );
}
