import { PageHeader, PageContent } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { FileEdit } from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';

export default function NewLeaveRequestLoading() {
  return (
    <>
      <PageHeader
        title="Request Leave"
        subtitle="Submit a new leave request for approval"
        breadcrumbs={[
          { label: 'Dashboard', href: '/employee' },
          { label: 'My Leave', href: '/employee/leave' },
          { label: 'New Request' }
        ]}
        actions={<Skeleton className="h-10 w-40" />}
      />

      <PageContent className="max-w-2xl">
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <FileEdit className={`${ICON_SIZES.md} text-purple-600`} />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Leave Request Form</h2>
              <p className="text-sm text-slate-500">Fill in the details below. Your request will be sent for approval.</p>
            </div>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div>
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
            <div>
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-24 w-full" />
            </div>
            <div className="flex justify-end gap-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
        </div>
      </PageContent>
    </>
  );
}
