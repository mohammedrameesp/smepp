import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import Link from 'next/link';
import { SubscriptionListTableServerSearch } from '@/components/subscriptions/subscription-list-table-server-search';
import { USD_TO_QAR_RATE } from '@/lib/constants';

export default async function AdminSubscriptionsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  if (process.env.NODE_ENV !== 'development' && session.user.role !== Role.ADMIN) {
    redirect('/forbidden');
  }

  // Fetch only statistics (not all subscriptions - table component fetches its own data)
  const [activeCount, cancelledCount, activeSubscriptions] = await Promise.all([
    prisma.subscription.count({ where: { status: 'ACTIVE' } }),
    prisma.subscription.count({ where: { status: 'CANCELLED' } }),
    prisma.subscription.findMany({
      where: { status: 'ACTIVE' },
      select: {
        billingCycle: true,
        renewalDate: true,
        costPerCycle: true,
        costCurrency: true,
      },
    }),
  ]);

  const activeSubscriptionsCount = activeCount;
  const cancelledSubscriptionsCount = cancelledCount;

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
      // All monthly subscriptions are charged this month
      if (currency === 'QAR') monthlyQAR += cost;
      else monthlyUSD += cost;
    } else if (sub.billingCycle === 'YEARLY' && sub.renewalDate) {
      // Check if yearly renewal falls in current month
      const renewalDate = new Date(sub.renewalDate);
      // Calculate next renewal from renewal date
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
        // This yearly subscription renews this month
        if (currency === 'QAR') yearlyRenewingQAR += cost;
        else yearlyRenewingUSD += cost;
      }
    }
  });

  const totalQAR = monthlyQAR + yearlyRenewingQAR;
  const totalUSD = monthlyUSD + yearlyRenewingUSD;
  const totalInQAR = totalQAR + (totalUSD * USD_TO_QAR_RATE);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Manage Subscriptions</h1>
              <p className="text-gray-600">
                View, edit, and manage all company subscriptions
              </p>
            </div>
            <Link href="/admin/subscriptions/new">
              <Button>+ Add Subscription</Button>
            </Link>
          </div>

          {/* Key Figures */}
          <div className="grid md:grid-cols-3 gap-3 mb-6">
            <Card>
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-medium text-gray-600">Active Subscriptions</CardTitle>
              </CardHeader>
              <CardContent className="pb-3 px-4">
                <div className="text-2xl font-bold text-gray-900">{activeSubscriptionsCount}</div>
                <p className="text-xs text-gray-500">
                  {cancelledSubscriptionsCount} cancelled
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-medium text-gray-600">This Month&apos;s Charges</CardTitle>
              </CardHeader>
              <CardContent className="pb-3 px-4">
                <div>
                  <div className="text-lg font-bold text-blue-900">
                    QAR {totalQAR.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500">
                    (M: {monthlyQAR.toFixed(0)} + Y: {yearlyRenewingQAR.toFixed(0)})
                  </div>
                  <div className="text-sm font-semibold text-green-900 mt-1">
                    USD {totalUSD.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500">
                    (M: {monthlyUSD.toFixed(0)} + Y: {yearlyRenewingUSD.toFixed(0)})
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-medium text-gray-600">Total (Converted to QAR)</CardTitle>
              </CardHeader>
              <CardContent className="pb-3 px-4">
                <div className="text-2xl font-bold text-purple-900">
                  QAR {totalInQAR.toFixed(2)}
                </div>
                <p className="text-xs text-gray-500">
                  1 USD = {USD_TO_QAR_RATE} QAR
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Subscriptions</CardTitle>
            <CardDescription>
              Complete list of registered subscriptions with filters and sorting
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SubscriptionListTableServerSearch />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
