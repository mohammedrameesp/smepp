/**
 * @module app/employee/(projects)/spend-requests/page
 * @description Employee spend requests list page. Displays the current user's submitted
 * spend requests with statistics (total, pending, approved, rejected) and a table view.
 * Allows employees to view their requests and navigate to create new ones.
 *
 * @route /employee/spend-requests
 * @access Authenticated employees
 *
 * @dependencies
 * - next-auth: Session authentication
 * - prisma: Database queries for spend request counts
 * - SpendRequestListTable: Shared table component with isAdmin=false mode
 *
 * @features
 * - Real-time count statistics by status
 * - Paginated request list (via SpendRequestListTable)
 * - New request creation link
 * - Breadcrumb navigation
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { Button } from '@/components/ui/button';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus, FileText, Clock, CheckCircle, XCircle } from 'lucide-react';
import { SpendRequestListTable } from '@/features/spend-requests/components';
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { StatChip, StatChipGroup } from '@/components/ui/stat-chip';
import { DetailCard } from '@/components/ui/detail-card';
import { ICON_SIZES } from '@/lib/constants';

export default async function EmployeeSpendRequestsPage() {
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
    prisma.spendRequest.count({ where: { requesterId: session.user.id } }),
    prisma.spendRequest.count({ where: { requesterId: session.user.id, status: 'PENDING' } }),
    prisma.spendRequest.count({ where: { requesterId: session.user.id, status: 'APPROVED' } }),
    prisma.spendRequest.count({ where: { requesterId: session.user.id, status: 'REJECTED' } }),
  ]);

  return (
    <>
      <PageHeader
        title="My Spend Requests"
        subtitle="Submit and track your spend requests"
        breadcrumbs={[
          { label: 'Dashboard', href: '/employee' },
          { label: 'Spend Requests' }
        ]}
        actions={
          <Link href="/employee/spend-requests/new">
            <Button>
              <Plus className={`${ICON_SIZES.sm} mr-2`} />
              New Request
            </Button>
          </Link>
        }
      >
        <StatChipGroup>
          <StatChip
            value={totalRequests}
            label="total requests"
            color="slate"
            icon={<FileText className={ICON_SIZES.sm} />}
          />
          {pendingRequests > 0 && (
            <StatChip
              value={pendingRequests}
              label="pending"
              color="amber"
              icon={<Clock className={ICON_SIZES.sm} />}
            />
          )}
          {approvedRequests > 0 && (
            <StatChip
              value={approvedRequests}
              label="approved"
              color="emerald"
              icon={<CheckCircle className={ICON_SIZES.sm} />}
            />
          )}
          {rejectedRequests > 0 && (
            <StatChip
              value={rejectedRequests}
              label="rejected"
              color="rose"
              icon={<XCircle className={ICON_SIZES.sm} />}
            />
          )}
        </StatChipGroup>
      </PageHeader>

      <PageContent>
        <DetailCard icon={FileText} iconColor="indigo" title="My Requests" subtitle="All spend requests you have submitted">
          <SpendRequestListTable isAdmin={false} />
        </DetailCard>
      </PageContent>
    </>
  );
}

/*
 * CODE REVIEW SUMMARY
 *
 * Purpose: Employee-facing spend requests list page showing user's own requests
 *
 * Key Logic:
 * - Session check with redirect to login if not authenticated
 * - Parallel database queries for status counts (optimized with Promise.all)
 * - Statistics conditionally shown only when count > 0
 * - Uses shared SpendRequestListTable with isAdmin=false flag
 *
 * Data Flow:
 * - Server component fetches count data directly via Prisma
 * - Filters all queries by requesterId = session.user.id
 * - Table component handles its own data fetching and pagination
 *
 * Edge Cases:
 * - No session: Redirects to /login
 * - No requests: Table shows empty state, only "total requests" stat shown
 *
 * Dependencies:
 * - SpendRequestListTable: Reusable table component shared with admin view
 * - StatChip/StatChipGroup: Unified statistics display pattern
 * - PageHeader/PageContent: Standard layout components
 *
 * Future Considerations:
 * - Could add filtering by status directly in URL params
 * - Could add search functionality
 * - Consider adding draft request support
 */
