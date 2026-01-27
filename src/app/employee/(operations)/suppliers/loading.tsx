import { PageHeader, PageContent } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2 } from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';

export default function SuppliersListLoading() {
  return (
    <>
      <PageHeader
        title="All Suppliers"
        subtitle="Browse and search approved company suppliers"
        breadcrumbs={[
          { label: 'Dashboard', href: '/employee' },
          { label: 'Suppliers' }
        ]}
      >
        <div className="flex flex-wrap items-center gap-4 mt-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-8 w-40" />
          ))}
        </div>
      </PageHeader>

      <PageContent>
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Building2 className={`${ICON_SIZES.md} text-indigo-600`} />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Company Suppliers</h2>
              <p className="text-sm text-slate-500">Search, filter, and browse all approved suppliers</p>
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
