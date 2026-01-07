/**
 * @file page.tsx
 * @description Employee My Holdings page - View all assigned assets and subscriptions
 * @module app/employee/(operations)/my-assets
 *
 * Features:
 * - Modern PageHeader layout with stat badges
 * - Asset history (current and past assignments)
 * - Subscription history (active and inactive)
 * - Breadcrumb navigation
 * - Quick stats in header
 *
 * Access: All authenticated employees
 * Route: /employee/my-assets
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { redirect } from 'next/navigation';
import { getMemberSubscriptionHistory } from '@/features/subscriptions';
import { getMemberAssetHistory } from '@/features/assets';
import { UserSubscriptionHistory, UserAssetHistory } from '@/components/domains/system/users';
import { PageHeader, PageContent } from '@/components/ui/page-header';

export default async function MyHoldingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.organizationId) {
    redirect('/login');
  }

  try {
    const tenantId = session.user.organizationId;

    // Get complete subscription history (including inactive ones)
    const subscriptionHistory = await getMemberSubscriptionHistory(session.user.id);

    // Get complete asset history (including past assignments)
    const assetHistory = await getMemberAssetHistory(session.user.id, tenantId);

    // Calculate stats
    const activeAssets = assetHistory.filter((a: any) => a.isCurrentlyAssigned);
    const activeSubscriptions = subscriptionHistory.filter((s: any) => s.status === 'ACTIVE');
    const totalAssets = assetHistory.length;
    const totalSubscriptions = subscriptionHistory.length;

    return (
      <>
        <PageHeader
          title="My Holdings"
          subtitle="View all assets and subscriptions assigned to you"
          breadcrumbs={[
            { label: 'Dashboard', href: '/employee' },
            { label: 'My Holdings' },
          ]}
        >
          {/* Stats Summary Badges */}
          <div className="flex flex-wrap items-center gap-4 mt-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 rounded-lg">
              <span className="text-blue-400 text-sm font-medium">
                {activeAssets.length} active assets
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 rounded-lg">
              <span className="text-emerald-400 text-sm font-medium">
                {activeSubscriptions.length} active subscriptions
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-500/20 rounded-lg">
              <span className="text-slate-400 text-sm font-medium">
                {totalAssets} total assets
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-500/20 rounded-lg">
              <span className="text-slate-400 text-sm font-medium">
                {totalSubscriptions} total subscriptions
              </span>
            </div>
          </div>
        </PageHeader>

        <PageContent>
          <div className="space-y-6">
            {/* Subscription History */}
            <UserSubscriptionHistory subscriptions={subscriptionHistory as any} viewMode="employee" />

            {/* Asset History */}
            <UserAssetHistory assets={assetHistory as any} viewMode="employee" />
          </div>
        </PageContent>
      </>
    );
  } catch (error) {
    console.error('Error in MyHoldingsPage:', error);
    return (
      <>
        <PageHeader
          title="My Holdings"
          subtitle="View all assets and subscriptions assigned to you"
          breadcrumbs={[
            { label: 'Dashboard', href: '/employee' },
            { label: 'My Holdings' },
          ]}
        />
        <PageContent>
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Error Loading Holdings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-600">An error occurred while loading your holdings. Please try again later.</p>
              <p className="text-sm text-gray-600 mt-2">{error instanceof Error ? error.message : 'Unknown error'}</p>
            </CardContent>
          </Card>
        </PageContent>
      </>
    );
  }
}
