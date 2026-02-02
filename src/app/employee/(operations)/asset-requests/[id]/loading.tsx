/**
 * @module app/employee/(operations)/asset-requests/[id]
 * @description Loading skeleton for the asset request detail page.
 *
 * Features:
 * - Status badges skeleton in header
 * - Asset details card with 4-field grid
 * - Request details section
 * - Activity history timeline skeleton
 */
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, FileText, Clock } from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';

export default function AssetRequestDetailLoading() {
  return (
    <>
      <PageHeader
        title="Loading..."
        subtitle="Please wait while we load the request details"
        breadcrumbs={[
          { label: 'Dashboard', href: '/employee' },
          { label: 'My Assets', href: '/employee/my-assets' },
          { label: 'Requests', href: '/employee/asset-requests' },
          { label: 'Details' }
        ]}
        actions={<Skeleton className="h-10 w-40" />}
      >
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-32" />
        </div>
      </PageHeader>

      <PageContent className="max-w-4xl">
        <div className="space-y-6">
          {/* Asset Details */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Package className={`${ICON_SIZES.md} text-purple-600`} />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Asset Details</h2>
                <p className="text-sm text-slate-500">Information about the requested asset</p>
              </div>
            </div>
            <div className="p-5">
              <div className="grid md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-4 bg-slate-50 rounded-xl">
                    <Skeleton className="h-3 w-20 mb-2" />
                    <Skeleton className="h-5 w-full" />
                  </div>
                ))}
              </div>
              <Skeleton className="h-10 w-40 mt-4" />
            </div>
          </div>

          {/* Request Details */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <FileText className={`${ICON_SIZES.md} text-indigo-600`} />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Request Details</h2>
                <p className="text-sm text-slate-500">Additional information about this request</p>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <Skeleton className="h-3 w-16 mb-2" />
                <div className="p-4 bg-slate-50 rounded-xl">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4 mt-2" />
                </div>
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
                  <Skeleton className="h-2 w-2 rounded-full mt-2 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
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
 * Issues: None - loading skeleton matches asset request detail layout
 */
