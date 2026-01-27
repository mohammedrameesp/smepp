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

import { prisma } from '@/lib/core/prisma';
import { redirect } from 'next/navigation';
import { getAdminAuthContext, hasAccess } from '@/lib/auth/impersonation-check';

import { SubscriptionListClient } from '@/features/subscriptions';
import { getExchangeRateToQAR } from '@/lib/core/currency';
import { Plus } from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';
import { PageHeader, PageHeaderButton, PageContent } from '@/components/ui/page-header';
import { StatChip, StatChipGroup } from '@/components/ui/stat-chip';

export default async function AdminSubscriptionsPage() {
  const auth = await getAdminAuthContext();

  // If not impersonating and no session, redirect to login
  if (!auth.isImpersonating && !auth.session) {
    redirect('/login');
  }

  // Check access (operations access required)
  if (!hasAccess(auth, 'operations')) {
    redirect('/forbidden');
  }

  if (!auth.tenantId) {
    redirect('/login');
  }

  const tenantId = auth.tenantId;

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
            <Plus className={ICON_SIZES.sm} />
            Add Subscription
          </PageHeaderButton>
        }
      >
        <StatChipGroup>
          <StatChip value={activeCount} label="active" color="blue" />
          <StatChip value={cancelledCount} label="cancelled" color="slate" hideWhenZero />
          <StatChip
            value={`QAR ${totalInQAR.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
            label="this month"
            color="emerald"
            hideWhenZero
          />
        </StatChipGroup>
      </PageHeader>

      <PageContent>
        {/* Subscriptions Table */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-4 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">All Subscriptions</h2>
            <p className="text-sm text-slate-500">Complete list with filters and sorting</p>
          </div>
          <div className="p-4">
            <SubscriptionListClient />
          </div>
        </div>
      </PageContent>
    </>
  );
}
