/**
 * @module app/employee/(hr)/leave/requests
 * @description Loading skeleton for the leave requests list page.
 *
 * Features:
 * - Search and filter skeletons
 * - Table rows with request card skeletons
 * - Pagination controls skeleton
 */
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText } from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';

export default function LeaveRequestsLoading() {
  return (
    <>
      <PageHeader
        title="My Leave Requests"
        subtitle="View and manage all your leave requests"
        breadcrumbs={[
          { label: 'Dashboard', href: '/employee' },
          { label: 'My Leave', href: '/employee/leave' },
          { label: 'All Requests' }
        ]}
        actions={<Skeleton className="h-10 w-32" />}
      />

      <PageContent>
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <FileText className={`${ICON_SIZES.md} text-indigo-600`} />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">All Requests</h2>
              <p className="text-sm text-slate-500">Filter and search through your leave requests</p>
            </div>
          </div>
          <div className="p-5">
            {/* Search and filters */}
            <div className="flex items-center gap-4 mb-4">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>

            {/* Table */}
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="p-4 rounded-xl border border-slate-200">
                  <div className="flex justify-between items-start mb-2">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex justify-between items-center mt-6">
              <Skeleton className="h-4 w-32" />
              <div className="flex gap-2">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-24" />
              </div>
            </div>
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
 *   - Added JSDoc module documentation at top
 * Issues: None - loading skeleton matches page layout
 */
