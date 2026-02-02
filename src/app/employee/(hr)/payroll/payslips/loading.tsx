/**
 * @module app/employee/(hr)/payroll/payslips
 * @description Loading skeleton for the payslips list page.
 *
 * Features:
 * - Year filter tabs skeleton
 * - Table with 7-column grid skeleton
 * - Pagination controls skeleton
 */
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText } from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';

export default function PayslipsListLoading() {
  return (
    <>
      <PageHeader
        title="My Payslips"
        subtitle="View and download your payslips"
        breadcrumbs={[
          { label: 'Dashboard', href: '/employee' },
          { label: 'Payroll', href: '/employee/payroll' },
          { label: 'Payslips' }
        ]}
        actions={<Skeleton className="h-10 w-40" />}
      >
        {/* Year Filter Skeleton */}
        <div className="flex gap-2 flex-wrap mt-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-8 w-20" />
          ))}
        </div>
      </PageHeader>

      <PageContent>
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <FileText className={`${ICON_SIZES.md} text-indigo-600`} />
            </div>
            <div>
              <Skeleton className="h-5 w-32 mb-1" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
          <div className="p-5">
            {/* Table Header */}
            <div className="grid grid-cols-7 gap-4 px-3 py-2 border-b border-slate-200 mb-3">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-3 w-12" />
              <div />
            </div>

            {/* Table Rows */}
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                <div key={i} className="grid grid-cols-7 gap-4 px-3 py-3 border-b border-slate-100">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-8 w-8" />
                </div>
              ))}
            </div>

            {/* Pagination Skeleton */}
            <div className="flex justify-center gap-2 mt-4">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-8 w-20" />
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
 * Issues: None - loading skeleton matches payslips list layout
 */
