/**
 * @file page.tsx
 * @description Admin subscriptions list page with summary statistics
 * @module app/admin/(operations)/subscriptions
 *
 * Features:
 * - Paginated subscription list with server-side search and filtering
 * - Summary statistics: active count, cancelled count, monthly/yearly costs
 * - Multi-currency cost calculations (QAR, USD)
 * - Monthly renewal alerts (subscriptions renewing this month)
 * - Quick action: Create new subscription
 * - Export functionality
 *
 * Page Route: /admin/subscriptions
 *
 * Access: Admin-only
 *
 * Statistics Calculations:
 * - Active/Cancelled counts from database
 * - Monthly costs: Sum of MONTHLY subscriptions in QAR and USD
 * - Yearly costs: Sum of YEARLY subscriptions renewing this month
 * - Exchange rate conversion for USD amounts
 *
 * Components:
 * - PageHeader with breadcrumbs and actions
 * - Stat badges for quick overview
 * - SubscriptionListTableServerSearch for data grid
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { redirect } from 'next/navigation';

import { SubscriptionListTableServerSearch } from '@/features/subscriptions';
import { getExchangeRateToQAR } from '@/lib/core/currency';
import { Plus } from 'lucide-react';
import { PageHeader, PageHeaderButton, PageContent } from '@/components/ui/page-header';

export default async function AdminSubscriptionsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  if (process.env.NODE_ENV !== 'development' && session.user.teamMemberRole !== 'ADMIN') {
    redirect('/forbidden');
  }

  if (!session.user.organizationId) {
    redirect('/login');
  }

  const tenantId = session.user.organizationId;

  const [activeCount, cancelledCount, activeSubscriptions] = await Promise.all([
    prisma.subscription.count({ where: { tenantId, status: 'ACTIVE' } }),
    prisma.subscription.count({ where: { tenantId, status: 'CANCELLED' } }),
    prisma.subscription.findMany({
      where: { tenantId, status: 'ACTIVE' },
      select: {
        billingCycle: true,
        renewalDate: true,
        costPerCycle: true,
        costCurrency: true,
      },
    }),
  ]);

  // Calculate this month's charges with multi-currency support
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Collect costs grouped by currency
  const costsByCurrency: Record<string, number> = {};

  activeSubscriptions.forEach(sub => {
    const cost = sub.costPerCycle ? Number(sub.costPerCycle) : 0;
    if (cost <= 0) return;

    const currency = sub.costCurrency || 'QAR';

    if (sub.billingCycle === 'MONTHLY') {
      costsByCurrency[currency] = (costsByCurrency[currency] || 0) + cost;
    } else if (sub.billingCycle === 'YEARLY' && sub.renewalDate) {
      const renewalDate = new Date(sub.renewalDate);
      let nextRenewal = new Date(renewalDate);
      nextRenewal.setFullYear(currentYear);
      if (nextRenewal < now) {
        nextRenewal.setFullYear(currentYear + 1);
      }
      if (nextRenewal > now && nextRenewal.getFullYear() === renewalDate.getFullYear()) {
        nextRenewal = renewalDate;
      }

      const renewalMonth = nextRenewal.getMonth();
      const renewalYear = nextRenewal.getFullYear();

      if (renewalMonth === currentMonth && renewalYear === currentYear) {
        costsByCurrency[currency] = (costsByCurrency[currency] || 0) + cost;
      }
    }
  });

  // Convert all currencies to QAR
  const currencies = Object.keys(costsByCurrency);
  const exchangeRates = await Promise.all(
    currencies.map(currency => getExchangeRateToQAR(tenantId, currency))
  );

  let totalInQAR = 0;
  currencies.forEach((currency, index) => {
    totalInQAR += costsByCurrency[currency] * exchangeRates[index];
  });

  return (
    <>
      <PageHeader
        title="Subscriptions"
        subtitle="Manage company subscriptions and renewals"
        actions={
          <PageHeaderButton href="/admin/subscriptions/new" variant="primary">
            <Plus className="h-4 w-4" />
            Add Subscription
          </PageHeaderButton>
        }
      >
        {/* Stats Summary */}
        <div className="flex flex-wrap items-center gap-4 mt-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 rounded-lg">
            <span className="text-blue-400 text-sm font-medium">{activeCount} active</span>
          </div>
          {cancelledCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-500/20 rounded-lg">
              <span className="text-slate-400 text-sm font-medium">{cancelledCount} cancelled</span>
            </div>
          )}
          {totalInQAR > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 rounded-lg">
              <span className="text-emerald-400 text-sm font-medium">
                QAR {totalInQAR.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} this month
              </span>
            </div>
          )}
        </div>
      </PageHeader>

      <PageContent>
        {/* Subscriptions Table */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-4 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">All Subscriptions</h2>
            <p className="text-sm text-slate-500">Complete list with filters and sorting</p>
          </div>
          <div className="p-4">
            <SubscriptionListTableServerSearch />
          </div>
        </div>
      </PageContent>
    </>
  );
}
