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
import { ICON_SIZES } from '@/lib/constants';
import { AssetRequestListTable } from '@/features/asset-requests';
import { PendingAssignmentsAlert } from '@/features/asset-requests';
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { StatChip, StatChipGroup } from '@/components/ui/stat-chip';
import { DetailCard } from '@/components/ui/detail-card';

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
        <StatChipGroup>
          <StatChip
            value={pendingAssignments.length}
            label="pending acceptance"
            color="amber"
            icon={<AlertCircle className={ICON_SIZES.sm} />}
            hideWhenZero
          />
          <StatChip
            value={pendingRequests.length}
            label="pending approval"
            color="blue"
            icon={<Clock className={ICON_SIZES.sm} />}
            hideWhenZero
          />
          <StatChip
            value={requests.length}
            label="total requests"
            color="slate"
            icon={<FileText className={ICON_SIZES.sm} />}
          />
        </StatChipGroup>
      </PageHeader>

      <PageContent>
        {/* Pending Assignments Alert */}
        <PendingAssignmentsAlert />

        {/* Requests List */}
        <DetailCard icon={Package} iconColor="indigo" title={`All Requests (${requests.length})`} subtitle="Your asset requests, assignments, and return requests">
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
        </DetailCard>
      </PageContent>
    </>
  );
}

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes: Added review summary
 * Issues: None identified
 */
