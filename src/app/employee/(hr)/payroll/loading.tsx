/**
 * @module app/employee/(hr)/payroll
 * @description Loading skeleton for the payroll overview page.
 *
 * Features:
 * - Salary overview card with component breakdown
 * - Quick stats grid (3 cards)
 * - Recent payslips list skeleton
 */
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Calculator, CreditCard, DollarSign } from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';

export default function PayrollOverviewLoading() {
  return (
    <>
      <PageHeader
        title="My Payroll"
        subtitle="View your salary details, payslips, and gratuity projection"
        breadcrumbs={[
          { label: 'Dashboard', href: '/employee' },
          { label: 'Payroll' }
        ]}
        actions={<Skeleton className="h-10 w-40" />}
      >
        <div className="flex flex-wrap items-center gap-4 mt-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-8 w-40" />
        </div>
      </PageHeader>

      <PageContent>
        {/* Salary Overview */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <DollarSign className={`${ICON_SIZES.md} text-emerald-600`} />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Salary Overview</h2>
              <p className="text-sm text-slate-500">Your current monthly salary breakdown</p>
            </div>
          </div>
          <div className="p-5">
            <div className="grid gap-4 md:grid-cols-3 mb-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 bg-slate-50 rounded-xl">
                  <Skeleton className="h-3 w-24 mb-2" />
                  <Skeleton className="h-6 w-32" />
                </div>
              ))}
            </div>
            <div className="pt-4 border-t border-slate-200">
              <Skeleton className="h-4 w-32 mb-3" />
              <div className="grid gap-3 md:grid-cols-5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="p-3 bg-slate-50 rounded-lg">
                    <Skeleton className="h-3 w-16 mb-1" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          {[Calculator, CreditCard, FileText].map((Icon, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <Skeleton className="h-4 w-32" />
                <Icon className={`${ICON_SIZES.sm} text-slate-400`} />
              </div>
              <Skeleton className="h-8 w-40 mb-2" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>

        {/* Recent Payslips */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <FileText className={`${ICON_SIZES.md} text-blue-600`} />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Recent Payslips</h2>
                <p className="text-sm text-slate-500">Your payment history</p>
              </div>
            </div>
            <Skeleton className="h-8 w-24" />
          </div>
          <div className="p-5">
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-slate-200">
                  <div>
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <div className="text-right">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </PageContent>
    </>
  );
}

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes:
 *   - Added JSDoc module documentation at top
 * Issues: None - loading skeleton matches payroll overview layout
 */
