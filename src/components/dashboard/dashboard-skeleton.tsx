'use client';

import { Skeleton } from '@/components/ui/skeleton';

export function DashboardSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 animate-in fade-in duration-500">
      {/* Welcome Section Skeleton */}
      <div className="mb-6">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Action Cards Row Skeleton */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl p-5 bg-slate-100 animate-pulse h-[180px] flex flex-col"
          >
            <div className="flex items-start justify-between mb-2">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <Skeleton className="h-8 w-12" />
            </div>
            <Skeleton className="h-5 w-28 mb-1" />
            <Skeleton className="h-3 w-20 mb-2" />
            <div className="flex-1" />
            <Skeleton className="h-9 w-full rounded-xl" />
          </div>
        ))}
      </div>

      {/* Stats Row Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-2xl p-4 bg-slate-50 border border-slate-100"
          >
            <div className="flex items-center justify-between mb-2">
              <Skeleton className="h-9 w-9 rounded-xl" />
            </div>
            <Skeleton className="h-8 w-12 mb-1" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>

      {/* Two Column Layout Skeleton */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Main Column */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="px-4 py-3 border-b border-slate-100">
              <Skeleton className="h-5 w-32" />
            </div>
            <div className="divide-y divide-slate-100">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4">
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-24 mb-2" />
                      <Skeleton className="h-3 w-40 mb-3" />
                      <Skeleton className="h-8 w-20 rounded-lg" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200">
              <div className="px-4 py-3 border-b border-slate-100">
                <Skeleton className="h-5 w-28" />
              </div>
              <div className="p-3 space-y-2">
                {[1, 2].map((j) => (
                  <div key={j} className="flex items-center gap-3 p-2">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-24 mb-1" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
