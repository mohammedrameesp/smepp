import { PageHeader, PageContent } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, Calculator, TrendingUp, Info } from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';

export default function GratuityProjectionLoading() {
  return (
    <>
      <PageHeader
        title="Gratuity Projection"
        subtitle="End of Service Benefits calculation"
        breadcrumbs={[
          { label: 'Dashboard', href: '/employee' },
          { label: 'Payroll', href: '/employee/payroll' },
          { label: 'Gratuity' }
        ]}
        actions={<Skeleton className="h-10 w-40" />}
      >
        <div className="flex flex-wrap items-center gap-4 mt-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-40" />
        </div>
      </PageHeader>

      <PageContent>
        <div className="space-y-6 max-w-5xl mx-auto">

          {/* Current Gratuity */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                <DollarSign className={`${ICON_SIZES.md} text-emerald-600`} />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Current Gratuity Amount</h2>
                <p className="text-sm text-slate-500">Based on your current service duration and basic salary</p>
              </div>
            </div>
            <div className="p-5">
              <Skeleton className="h-12 w-48 mb-6" />

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-4 bg-slate-50 rounded-xl">
                    <Skeleton className="h-3 w-24 mb-2" />
                    <Skeleton className="h-5 w-32" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Calculation Breakdown */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Calculator className={`${ICON_SIZES.md} text-purple-600`} />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Calculation Breakdown</h2>
                <p className="text-sm text-slate-500">How your gratuity is computed</p>
              </div>
            </div>
            <div className="p-5">
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="flex justify-between py-2 border-b border-slate-200">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
                <div className="flex justify-between py-3 pt-4">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-6 w-32" />
                </div>
              </div>
            </div>
          </div>

          {/* Future Projections */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <TrendingUp className={`${ICON_SIZES.md} text-blue-600`} />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Future Projections</h2>
                <p className="text-sm text-slate-500">Estimated gratuity if you continue working</p>
              </div>
            </div>
            <div className="p-5">
              <div className="grid gap-4 md:grid-cols-5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="p-4 bg-slate-50 rounded-xl text-center border border-slate-200">
                    <Skeleton className="h-4 w-20 mx-auto mb-2" />
                    <Skeleton className="h-5 w-24 mx-auto" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Formula Explanation */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Info className={`${ICON_SIZES.md} text-indigo-600`} />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">How is Gratuity Calculated?</h2>
                <p className="text-sm text-slate-500">Understanding the formula</p>
              </div>
            </div>
            <div className="p-5">
              <Skeleton className="h-4 w-full mb-3" />
              <div className="space-y-2 mb-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          </div>
        </div>
      </PageContent>
    </>
  );
}
