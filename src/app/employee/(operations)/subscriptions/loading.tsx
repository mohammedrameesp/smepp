/**
 * @file loading.tsx
 * @description Loading skeleton for employee subscriptions list page
 * @module app/employee/(operations)/subscriptions
 *
 * Features:
 * - Animated skeleton matching the actual page layout
 * - Header with 3 stat badge skeletons (my/active/total)
 * - Table with 6 column headers and 8 row skeletons
 * - Purple icon box with Package icon (non-loading element)
 *
 * Shows while employee subscriptions page fetches data from database.
 */
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Package } from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';

export default function SubscriptionsListLoading() {
  return (
    <>
      <PageHeader
        title="All Subscriptions"
        subtitle="Browse and search all company subscriptions"
        breadcrumbs={[
          { label: 'Dashboard', href: '/employee' },
          { label: 'Subscriptions' }
        ]}
      >
        <div className="flex flex-wrap items-center gap-4 mt-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-8 w-36" />
          ))}
        </div>
      </PageHeader>

      <PageContent>
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <Package className={`${ICON_SIZES.md} text-purple-600`} />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Company Subscriptions</h2>
              <p className="text-sm text-slate-500">Search, filter, and browse all subscriptions in the organization</p>
            </div>
          </div>
          <div className="p-5">
            {/* Table Header */}
            <div className="grid grid-cols-6 gap-4 px-3 py-2 border-b border-slate-200 mb-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-3 w-20" />
              ))}
            </div>

            {/* Table Rows */}
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="grid grid-cols-6 gap-4 px-3 py-3 border-b border-slate-100">
                  {[1, 2, 3, 4, 5, 6].map((j) => (
                    <Skeleton key={j} className="h-4 w-full" />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </PageContent>
    </>
  );
}
