/**
 * @module app/employee/(hr)/leave/[id]
 * @description Loading skeleton for the leave request detail page.
 *
 * Features:
 * - Leave details card skeleton with date range info
 * - Balance summary grid skeleton
 * - Activity history timeline skeleton
 */
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Clock, Info } from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';

export default function LeaveRequestDetailLoading() {
  return (
    <>
      <PageHeader
        title="Loading..."
        subtitle="Please wait while we load the request details"
        breadcrumbs={[
          { label: 'Dashboard', href: '/employee' },
          { label: 'My Leave', href: '/employee/leave' },
          { label: 'Request Details' }
        ]}
        actions={<Skeleton className="h-10 w-40" />}
      />

      <PageContent className="max-w-3xl">
        {/* Leave Details */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <Calendar className={`${ICON_SIZES.md} text-purple-600`} />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Leave Details</h2>
              <p className="text-sm text-slate-500">Request information and dates</p>
            </div>
          </div>
          <div className="p-5 space-y-4">
            <Skeleton className="h-6 w-40" />
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl">
                <Skeleton className="h-3 w-20 mb-2" />
                <Skeleton className="h-5 w-full" />
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <Skeleton className="h-3 w-16 mb-2" />
                <Skeleton className="h-5 w-24" />
              </div>
            </div>
            <div>
              <Skeleton className="h-3 w-16 mb-2" />
              <div className="p-4 bg-slate-50 rounded-xl">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4 mt-2" />
              </div>
            </div>
          </div>
        </div>

        {/* Balance Summary */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Info className={`${ICON_SIZES.md} text-emerald-600`} />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Balance Summary</h2>
              <Skeleton className="h-4 w-32 mt-1" />
            </div>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="text-center p-4 bg-slate-50 rounded-xl">
                  <Skeleton className="h-8 w-16 mx-auto mb-2" />
                  <Skeleton className="h-4 w-24 mx-auto" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* History */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Clock className={`${ICON_SIZES.md} text-blue-600`} />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">History</h2>
              <p className="text-sm text-slate-500">Request activity timeline</p>
            </div>
          </div>
          <div className="p-5 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
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
 * Issues: None - loading skeleton matches detail page layout
 */
