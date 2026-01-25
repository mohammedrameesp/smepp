import { PageHeader, PageContent } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText } from 'lucide-react';

export default function PurchaseRequestsListLoading() {
  return (
    <>
      <PageHeader
        title="My Spend Requests"
        subtitle="Submit and track your spend requests"
        breadcrumbs={[
          { label: 'Dashboard', href: '/employee' },
          { label: 'Spend Requests' }
        ]}
        actions={<Skeleton className="h-10 w-36" />}
      >
        <div className="flex flex-wrap items-center gap-4 mt-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-8 w-32" />
          ))}
        </div>
      </PageHeader>

      <PageContent>
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <FileText className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">My Requests</h2>
              <p className="text-sm text-slate-500">All purchase requests you have submitted</p>
            </div>
          </div>
          <div className="p-5">
            {/* Table Header */}
            <div className="grid grid-cols-7 gap-4 px-3 py-2 border-b border-slate-200 mb-3">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <Skeleton key={i} className="h-3 w-20" />
              ))}
            </div>

            {/* Table Rows */}
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="grid grid-cols-7 gap-4 px-3 py-3 border-b border-slate-100">
                  {[1, 2, 3, 4, 5, 6, 7].map((j) => (
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
