import { PageHeader, PageContent } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Building, TrendingUp, TrendingDown, DollarSign, CreditCard } from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';

export default function PayslipDetailLoading() {
  return (
    <>
      <PageHeader
        title="Loading..."
        subtitle="Please wait while we load your payslip"
        breadcrumbs={[
          { label: 'Dashboard', href: '/employee' },
          { label: 'Payroll', href: '/employee/payroll' },
          { label: 'Payslips', href: '/employee/payroll/payslips' },
          { label: 'Details' }
        ]}
        badge={{ text: 'Loading', variant: 'default' }}
        actions={<Skeleton className="h-10 w-40" />}
      />

      <PageContent>
        <div className="space-y-6 max-w-4xl mx-auto">

        {/* Employee Details */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Building className={`${ICON_SIZES.md} text-indigo-600`} />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Employee Information</h2>
              <p className="text-sm text-slate-500">Your employment and payment details</p>
            </div>
          </div>
          <div className="p-5">
            <div className="grid gap-4 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 bg-slate-50 rounded-xl">
                  <Skeleton className="h-3 w-20 mb-2" />
                  <Skeleton className="h-5 w-full" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Earnings */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                <TrendingUp className={`${ICON_SIZES.md} text-emerald-600`} />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Earnings</h2>
                <p className="text-sm text-slate-500">Your salary components</p>
              </div>
            </div>
            <div className="p-5">
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex justify-between py-2 border-b border-slate-200">
                    <Skeleton className="h-4 w-32" />
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

          {/* Deductions */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center">
                <TrendingDown className={`${ICON_SIZES.md} text-rose-600`} />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Deductions</h2>
                <p className="text-sm text-slate-500">Amounts deducted from salary</p>
              </div>
            </div>
            <div className="p-5">
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex justify-between py-2 border-b border-slate-200">
                    <Skeleton className="h-4 w-32" />
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
        </div>

        {/* Net Pay Summary */}
        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl overflow-hidden">
          <div className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className={`${ICON_SIZES.lg} text-emerald-700`} />
                  <h3 className="text-xl font-semibold text-emerald-900">Net Pay</h3>
                </div>
                <Skeleton className="h-4 w-64" />
              </div>
              <Skeleton className="h-12 w-40" />
            </div>
          </div>
        </div>

        {/* Payment Info Skeleton */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <CreditCard className={`${ICON_SIZES.md} text-blue-600`} />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Payment Information</h2>
              <p className="text-sm text-slate-500">Salary payment confirmation</p>
            </div>
          </div>
          <div className="p-5">
            <div className="p-4 bg-slate-50 rounded-xl">
              <Skeleton className="h-3 w-24 mb-2" />
              <Skeleton className="h-5 w-40" />
            </div>
          </div>
        </div>
        </div>
      </PageContent>
    </>
  );
}
