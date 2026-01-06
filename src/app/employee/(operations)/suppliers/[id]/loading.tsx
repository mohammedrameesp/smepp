import { PageHeader, PageContent } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, User, FileText, CheckCircle, Calendar } from 'lucide-react';

export default function SupplierDetailLoading() {
  return (
    <>
      <PageHeader
        title="Loading..."
        subtitle="Please wait while we load the supplier details"
        breadcrumbs={[
          { label: 'Dashboard', href: '/employee' },
          { label: 'Suppliers', href: '/employee/suppliers' },
          { label: 'Details' }
        ]}
        actions={<Skeleton className="h-10 w-44" />}
      >
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-32" />
        </div>
      </PageHeader>

      <PageContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Company Information */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">Company Information</h2>
                  <p className="text-sm text-slate-500">Supplier details and location</p>
                </div>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-2 gap-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className={`p-4 bg-slate-50 rounded-xl ${i === 3 || i === 6 ? 'col-span-2' : ''}`}>
                      <Skeleton className="h-3 w-20 mb-2" />
                      <Skeleton className="h-5 w-full" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center">
                  <User className="h-5 w-5 text-rose-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">Contact Information</h2>
                  <p className="text-sm text-slate-500">Primary and secondary contacts</p>
                </div>
              </div>
              <div className="p-5 space-y-6">
                {[1, 2].map((section) => (
                  <div key={section} className={section === 1 ? 'pb-6 border-b border-slate-200' : ''}>
                    <Skeleton className="h-4 w-28 mb-3" />
                    <div className="grid grid-cols-2 gap-3">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className={`p-3 bg-slate-50 rounded-xl ${i > 2 ? 'col-span-2' : ''}`}>
                          <Skeleton className="h-3 w-16 mb-2" />
                          <Skeleton className="h-4 w-full" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Terms */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <FileText className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">Payment Terms</h2>
                  <p className="text-sm text-slate-500">Contract and payment details</p>
                </div>
              </div>
              <div className="p-5">
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Approval Information */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">Approval Information</h2>
                  <p className="text-sm text-slate-500">Supplier approval details</p>
                </div>
              </div>
              <div className="p-5 space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="p-3 bg-slate-50 rounded-xl">
                    <Skeleton className="h-3 w-20 mb-2" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </div>
            </div>

            {/* Engagement History */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">Engagement History</h2>
                  <p className="text-sm text-slate-500">Activity timeline</p>
                </div>
              </div>
              <div className="p-5">
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="border-l-2 border-indigo-500 pl-4 py-2">
                      <div className="flex items-start justify-between mb-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-3 w-32" />
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
