/**
 * @file loading.tsx
 * @description Loading skeleton for asset edit page
 * @module app/admin/(operations)/assets/[id]/edit
 */

import { Skeleton } from '@/components/ui/skeleton';

export default function EditAssetLoading() {
  return (
    <div className="animate-in fade-in duration-300">
      {/* Page Header Skeleton */}
      <div className="bg-slate-800 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="h-4 w-16 bg-slate-700" />
            <Skeleton className="h-4 w-4 bg-slate-700" />
            <Skeleton className="h-4 w-24 bg-slate-700" />
            <Skeleton className="h-4 w-4 bg-slate-700" />
            <Skeleton className="h-4 w-12 bg-slate-700" />
          </div>
          <div>
            <Skeleton className="h-7 w-32 mb-2 bg-slate-700" />
            <Skeleton className="h-4 w-48 bg-slate-700" />
          </div>
        </div>
      </div>

      {/* Page Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="max-w-2xl">
          {/* Card */}
          <div className="bg-white rounded-lg border shadow-sm">
            {/* Card Header */}
            <div className="p-6 border-b">
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>

            {/* Card Content */}
            <div className="p-6 space-y-6">
              {/* Section 1: Asset Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-3 w-40" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <Skeleton className="h-9 w-44" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              </div>

              {/* Section 2: Acquisition Details */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <div className="flex gap-2">
                    <Skeleton className="h-10 flex-1" />
                    <Skeleton className="h-10 w-24" />
                  </div>
                </div>
              </div>

              {/* Section 3: Status & Assignment */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-4 w-36" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4">
                <Skeleton className="h-10 w-20" />
                <Skeleton className="h-10 w-28" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
