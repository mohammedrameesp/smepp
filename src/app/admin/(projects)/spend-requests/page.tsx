/**
 * @file page.tsx
 * @description Admin spend requests list page - displays all spend requests with statistics
 * @module app/admin/(projects)/spend-requests
 *
 * Features:
 * - Spend request statistics (total, pending, approved, under review, completed)
 * - Total approved value calculation
 * - Spend request list with filtering and search
 * - Admin actions for reviewing and managing requests
 *
 * Security:
 * - Requires authenticated session or impersonation
 * - Requires admin access permission
 * - All queries are tenant-scoped
 */

import { prisma } from '@/lib/core/prisma';
import { redirect } from 'next/navigation';
import { getAdminAuthContext, hasAccess } from '@/lib/core/impersonation-check';

import { SpendRequestListClient } from '@/features/spend-requests/components';
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { StatChip, StatChipGroup } from '@/components/ui/stat-chip';

/**
 * Admin spend requests list page component
 * Fetches spend request statistics and renders the management interface
 */
export default async function AdminSpendRequestsPage(): Promise<React.JSX.Element> {
  const auth = await getAdminAuthContext();

  // If not impersonating and no session, redirect to login
  if (!auth.isImpersonating && !auth.session) {
    redirect('/login');
  }

  // Check access (any admin can access spend requests)
  if (!hasAccess(auth)) {
    redirect('/forbidden');
  }

  if (!auth.tenantId) {
    redirect('/login');
  }

  const tenantId = auth.tenantId;

  // Fetch statistics
  const [
    totalRequests,
    pendingRequests,
    approvedRequests,
    underReviewRequests,
    completedRequests,
    totalAmountResult,
  ] = await Promise.all([
    prisma.spendRequest.count({ where: { tenantId } }),
    prisma.spendRequest.count({ where: { tenantId, status: 'PENDING' } }),
    prisma.spendRequest.count({ where: { tenantId, status: 'APPROVED' } }),
    prisma.spendRequest.count({ where: { tenantId, status: 'UNDER_REVIEW' } }),
    prisma.spendRequest.count({ where: { tenantId, status: 'COMPLETED' } }),
    prisma.spendRequest.aggregate({
      where: { tenantId, status: { in: ['APPROVED', 'COMPLETED'] } },
      _sum: { totalAmountQAR: true },
    }),
  ]);

  const totalApprovedAmount = totalAmountResult._sum.totalAmountQAR
    ? Number(totalAmountResult._sum.totalAmountQAR)
    : 0;

  return (
    <>
      <PageHeader
        title="Spend Requests"
        subtitle="Review and manage all spend requests from employees"
      >
        <StatChipGroup>
          <StatChip value={totalRequests} label="total" color="blue" />
          <StatChip value={pendingRequests} label="pending" color="amber" hideWhenZero />
          <StatChip value={underReviewRequests} label="under review" color="cyan" hideWhenZero />
          <StatChip value={approvedRequests} label="approved" color="emerald" />
          <StatChip value={completedRequests} label="completed" color="purple" />
          <StatChip
            value={`QAR ${totalApprovedAmount.toLocaleString()}`}
            label="approved value"
            color="emerald"
            hideWhenZero
          />
        </StatChipGroup>
      </PageHeader>

      <PageContent>
        {/* Requests Table */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-4 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">All Spend Requests</h2>
            <p className="text-sm text-slate-500">View, review, and manage all employee spend requests</p>
          </div>
          <div className="p-4">
            <SpendRequestListClient isAdmin={true} />
          </div>
        </div>
      </PageContent>
    </>
  );
}

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes:
 * - Added JSDoc module documentation at top of file
 * - Added function return type annotation
 * Issues: None - tenant isolation properly implemented with tenantId filtering
 */
