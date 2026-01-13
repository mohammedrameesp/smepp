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
import { UserSubscriptionHistory, UserAssetHistory } from '@/features/users/components';
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { StatChip, StatChipGroup } from '@/components/ui/stat-chip';

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
    const activeAssets = assetHistory.filter((a): a is NonNullable<typeof a> => a !== null && a.isCurrentlyAssigned);
    const activeSubscriptions = subscriptionHistory.filter((s) => s.status === 'ACTIVE');
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
          <StatChipGroup>
            <StatChip value={activeAssets.length} label="active assets" color="blue" />
            <StatChip value={activeSubscriptions.length} label="active subscriptions" color="emerald" />
            <StatChip value={totalAssets} label="total assets" color="slate" />
            <StatChip value={totalSubscriptions} label="total subscriptions" color="slate" />
          </StatChipGroup>
        </PageHeader>

        <PageContent>
          <div className="space-y-6">
            {/* Subscription History */}
            <UserSubscriptionHistory subscriptions={subscriptionHistory} viewMode="employee" />

            {/* Asset History */}
            <UserAssetHistory assets={assetHistory.filter((a): a is NonNullable<typeof a> => a !== null)} viewMode="employee" />
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
