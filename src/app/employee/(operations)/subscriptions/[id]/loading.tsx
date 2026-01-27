/**
 * @file loading.tsx
 * @description Loading skeleton for employee subscription detail page
 * @module app/employee/(operations)/subscriptions/[id]
 *
 * Features:
 * - Animated skeleton matching the detail page layout
 * - Header with 2 badge skeletons (status, billing cycle)
 * - Main content area (left): Subscription details (5 fields), cost breakdown (3 rows), assignment info (2 fields)
 * - Sidebar (right): Renewal card, key dates (3 items), history timeline (3 events)
 * - Static icon boxes (purple/emerald/blue) to maintain visual structure
 *
 * Layout Structure:
 * - 3-column responsive grid (2 columns main content, 1 column sidebar)
 * - Matches actual page structure with card-based layout
 * - Purple icons: Subscription details
 * - Emerald icons: Cost breakdown, renewal info
 * - Blue icons: Assignment info, key dates
 * - Gray icons: History timeline
 *
 * Shows while subscription detail page fetches data from database.
 */

import { PageHeader, PageContent } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, Calendar, UserIcon, FileText, Clock } from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';

export default function SubscriptionDetailLoading() {
  return (
    <>
      <PageHeader
        title="Loading..."
        subtitle="Please wait while we load the subscription details"
        breadcrumbs={[
          { label: 'Dashboard', href: '/employee' },
          { label: 'Subscriptions', href: '/employee/subscriptions' },
          { label: 'Details' }
        ]}
        actions={<Skeleton className="h-10 w-44" />}
      >
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-24" />
        </div>
      </PageHeader>

      <PageContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Subscription Details */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Package className={`${ICON_SIZES.md} text-purple-600`} />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">Subscription Details</h2>
                  <p className="text-sm text-slate-500">Service information and account details</p>
                </div>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-2 gap-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className={`p-4 bg-slate-50 rounded-xl ${i === 5 ? 'col-span-2' : ''}`}>
                      <Skeleton className="h-3 w-20 mb-2" />
                      <Skeleton className="h-5 w-full" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Cost Breakdown */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <FileText className={`${ICON_SIZES.md} text-emerald-600`} />
                </div>
                <div className="flex-1">
                  <Skeleton className="h-5 w-32 mb-1" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
              <div className="p-5">
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              </div>
            </div>

            {/* Assignment Info */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <UserIcon className={`${ICON_SIZES.md} text-blue-600`} />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">Assignment Information</h2>
                  <p className="text-sm text-slate-500">Current subscription assignment</p>
                </div>
              </div>
              <div className="p-5 space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="p-4 bg-slate-50 rounded-xl">
                    <Skeleton className="h-3 w-20 mb-2" />
                    <Skeleton className="h-5 w-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Renewal Info */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <Calendar className={`${ICON_SIZES.md} text-emerald-600`} />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">Next Renewal</h2>
                  <p className="text-sm text-slate-500">Upcoming billing date</p>
                </div>
              </div>
              <div className="p-5">
                <Skeleton className="h-20 w-full" />
              </div>
            </div>

            {/* Key Dates */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Calendar className={`${ICON_SIZES.md} text-blue-600`} />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">Key Dates</h2>
                  <p className="text-sm text-slate-500">Important timestamps</p>
                </div>
              </div>
              <div className="p-5 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-3 bg-slate-50 rounded-xl">
                    <Skeleton className="h-3 w-20 mb-2" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </div>
            </div>

            {/* History */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                  <Clock className={`${ICON_SIZES.md} text-slate-600`} />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">History</h2>
                  <p className="text-sm text-slate-500">Activity timeline</p>
                </div>
              </div>
              <div className="p-5">
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-3 pb-4 border-b border-slate-200">
                      <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageContent>
    </>
  );
}
