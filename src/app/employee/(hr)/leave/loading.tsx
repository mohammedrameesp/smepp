import { PageHeader, PageContent } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Clock, FileText } from 'lucide-react';

export default function LeaveLoading() {
  return (
    <>
      <PageHeader
        title="My Leave"
        subtitle="View your leave balance and manage requests"
        breadcrumbs={[
          { label: 'Dashboard', href: '/employee' },
          { label: 'My Leave' }
        ]}
        actions={<Skeleton className="h-10 w-32" />}
      >
        <div className="flex flex-wrap items-center gap-4 mt-4">
          <Skeleton className="h-8 w-40" />
        </div>
      </PageHeader>

      <PageContent>
        {/* Leave Balances */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-slate-900">My Leave Balance</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5">
                <Skeleton className="h-6 w-32 mb-3" />
                <Skeleton className="h-4 w-24 mb-4" />
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Recent Requests */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <FileText className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">Recent Requests</h2>
                  <p className="text-sm text-slate-500">Your latest leave requests</p>
                </div>
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
            <div className="p-5 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-3 rounded-xl border border-slate-200">
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-4 w-48" />
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Leaves */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                <Clock className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Upcoming Leaves</h2>
                <p className="text-sm text-slate-500">Your approved leaves in the next 7 days</p>
              </div>
            </div>
            <div className="p-5 space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="p-3 rounded-xl border border-emerald-200 bg-emerald-50">
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-4 w-48" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </PageContent>
    </>
  );
}
