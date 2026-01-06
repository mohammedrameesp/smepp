import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { EmployeeSubscriptionListTable } from '@/components/domains/operations/subscriptions/employee-subscription-list-table';
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { Package, CheckCircle, User } from 'lucide-react';

export default async function EmployeeSubscriptionsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  try {
    // Fetch all subscriptions with related data
    const subscriptionsRaw = await prisma.subscription.findMany({
      include: {
        assignedMember: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Convert Decimal to number for client component
    const subscriptions = subscriptionsRaw.map(sub => ({
      ...sub,
      costPerCycle: sub.costPerCycle ? Number(sub.costPerCycle) : null,
    }));

    // Calculate stats
    const mySubscriptions = subscriptions.filter(s => s.assignedMemberId === session.user.id);
    const activeSubscriptions = subscriptions.filter(s => s.status === 'ACTIVE');
    const myActiveSubscriptions = mySubscriptions.filter(s => s.status === 'ACTIVE');

  return (
    <>
      <PageHeader
        title="All Subscriptions"
        subtitle="Browse and search all company subscriptions"
        breadcrumbs={[
          { label: 'Dashboard', href: '/employee' },
          { label: 'Subscriptions' }
        ]}
      >
        <div className="flex flex-wrap items-center gap-4 mt-4">
          <Link href="/employee/my-assets?tab=subscriptions">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 rounded-lg hover:bg-blue-500/30 transition-colors cursor-pointer">
              <User className="h-4 w-4 text-blue-400" />
              <span className="text-blue-400 text-sm font-medium">
                {myActiveSubscriptions.length} my subscriptions
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 rounded-lg">
            <CheckCircle className="h-4 w-4 text-emerald-400" />
            <span className="text-emerald-400 text-sm font-medium">
              {activeSubscriptions.length} active
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-500/20 rounded-lg">
            <Package className="h-4 w-4 text-slate-400" />
            <span className="text-slate-400 text-sm font-medium">
              {subscriptions.length} total
            </span>
          </div>
        </div>
      </PageHeader>

      <PageContent>
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <Package className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Company Subscriptions</h2>
              <p className="text-sm text-slate-500">Search, filter, and browse all subscriptions in the organization</p>
            </div>
          </div>
          <div className="p-5">
            {subscriptions.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <div className="text-4xl mb-4">📦</div>
                <p>No subscriptions found</p>
              </div>
            ) : (
              <EmployeeSubscriptionListTable subscriptions={subscriptions} currentUserId={session.user.id} />
            )}
          </div>
        </div>
      </PageContent>
    </>
  );
  } catch (error) {
    console.error('Error in EmployeeSubscriptionsPage:', error);
    return (
      <>
        <PageHeader
          title="Error Loading Subscriptions"
          subtitle="An error occurred while loading subscriptions"
          breadcrumbs={[
            { label: 'Dashboard', href: '/employee' },
            { label: 'Subscriptions' }
          ]}
        />
        <PageContent>
          <div className="bg-rose-50 rounded-2xl border border-rose-200 p-6">
            <p className="text-rose-600 font-medium">An error occurred while loading subscriptions. Please try again later.</p>
            <p className="text-sm text-slate-600 mt-2">{error instanceof Error ? error.message : 'Unknown error'}</p>
          </div>
        </PageContent>
      </>
    );
  }
}
