import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import Link from 'next/link';
import { SubscriptionListTableServerSearch } from '@/components/subscriptions/subscription-list-table-server-search';
import { USD_TO_QAR_RATE } from '@/lib/constants';
import { CreditCard, Plus, DollarSign, Calendar } from 'lucide-react';
import { StatsCard, StatsCardGrid } from '@/components/ui/stats-card';

export default async function AdminSubscriptionsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  if (process.env.NODE_ENV !== 'development' && session.user.role !== Role.ADMIN) {
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

  // Calculate this month's charges
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let monthlyQAR = 0;
  let monthlyUSD = 0;
  let yearlyRenewingQAR = 0;
  let yearlyRenewingUSD = 0;

  activeSubscriptions.forEach(sub => {
    const cost = sub.costPerCycle ? Number(sub.costPerCycle) : 0;
    const currency = sub.costCurrency || 'QAR';

    if (sub.billingCycle === 'MONTHLY') {
      if (currency === 'QAR') monthlyQAR += cost;
      else monthlyUSD += cost;
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
        if (currency === 'QAR') yearlyRenewingQAR += cost;
        else yearlyRenewingUSD += cost;
      }
    }
  });

  const totalQAR = monthlyQAR + yearlyRenewingQAR;
  const totalUSD = monthlyUSD + yearlyRenewingUSD;
  const totalInQAR = totalQAR + (totalUSD * USD_TO_QAR_RATE);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Subscriptions</h1>
          <p className="text-slate-500 text-sm">Manage company subscriptions and renewals</p>
        </div>
        <Link
          href="/admin/subscriptions/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Subscription
        </Link>
      </div>

      {/* Stats Cards */}
      <StatsCardGrid columns={4} className="mb-6">
        <StatsCard
          title="Active"
          subtitle={`${cancelledCount} cancelled`}
          value={activeCount}
          icon={CreditCard}
          color="blue"
        />
        <StatsCard
          title="QAR This Month"
          subtitle="Monthly + Yearly renewals"
          value={totalQAR.toFixed(0)}
          icon={DollarSign}
          color="emerald"
        />
        <StatsCard
          title="USD This Month"
          subtitle="Monthly + Yearly renewals"
          value={totalUSD.toFixed(0)}
          icon={DollarSign}
          color="amber"
        />
        <StatsCard
          title="Total (QAR)"
          subtitle="All converted"
          value={`${(totalInQAR / 1000).toFixed(1)}K`}
          icon={Calendar}
          color="purple"
        />
      </StatsCardGrid>

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
    </div>
  );
}
