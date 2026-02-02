/**
 * @module app/employee/(operations)/asset-requests
 * @description Loading skeleton for the asset requests list page.
 *
 * Features:
 * - Stat badge skeletons in header
 * - Search and filter controls skeleton
 * - Request card list skeleton with pagination
 */
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Package } from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';

export default function AssetRequestsLoading() {
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
        actions={<Skeleton className="h-10 w-32" />}
      >
        <div className="flex flex-wrap items-center gap-4 mt-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-8 w-32" />
        </div>
      </PageHeader>

      <PageContent>
        {/* Requests List */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Package className={`${ICON_SIZES.md} text-indigo-600`} />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-slate-900">All Requests</h2>
              <p className="text-sm text-slate-500">Your asset requests, assignments, and return requests</p>
            </div>
          </div>
          <div className="p-5">
            {/* Search and filters */}
            <div className="flex items-center gap-4 mb-4">
              <Skeleton className="h-10 flex-1" />
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
 * Issues: None - loading skeleton matches asset requests layout
 */
