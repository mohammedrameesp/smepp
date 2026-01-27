import { PageHeader, PageContent } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, ShoppingCart, Clock } from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';

export default function SpendRequestDetailLoading() {
  return (
    <>
      <PageHeader
        title="Loading..."
        subtitle="Please wait while we load the spend request"
        breadcrumbs={[
          { label: 'Dashboard', href: '/employee' },
          { label: 'Spend Requests', href: '/employee/spend-requests' },
          { label: 'Details' }
        ]}
        actions={<Skeleton className="h-10 w-40" />}
      >
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-20" />
        </div>
      </PageHeader>

      <PageContent className="max-w-4xl">
        <div className="space-y-6">
          {/* Request Details */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <FileText className={`${ICON_SIZES.md} text-purple-600`} />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Request Details</h2>
                <p className="text-sm text-slate-500">Spend request information</p>
              </div>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-4 bg-slate-50 rounded-xl">
                    <Skeleton className="h-3 w-20 mb-2" />
                    <Skeleton className="h-5 w-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <ShoppingCart className={`${ICON_SIZES.md} text-indigo-600`} />
              </div>
              <div>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-48 mt-1" />
              </div>
            </div>
            <div className="p-5">
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                    <Skeleton className="h-4 w-8" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-24" />
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
            <div className="p-5">
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-4 pb-4 border-b border-slate-200">
                    <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-3 w-24" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </PageContent>
    </>
  );
}
