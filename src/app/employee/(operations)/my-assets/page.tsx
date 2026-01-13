/**
 * @file page.tsx
 * @description Employee My Holdings page - Modern design with hero stats and tabbed interface
 * @module app/employee/(operations)/my-assets
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { redirect } from 'next/navigation';
import { getMemberSubscriptionHistory } from '@/features/subscriptions';
import { getMemberAssetHistory } from '@/features/assets';
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { StatChip, StatChipGroup } from '@/components/ui/stat-chip';
import { MyHoldingsContent } from './holdings-content';

export default async function MyHoldingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.organizationId) {
    redirect('/login');
  }

  try {
    const tenantId = session.user.organizationId;

    const [subscriptionHistory, assetHistory] = await Promise.all([
      getMemberSubscriptionHistory(session.user.id),
      getMemberAssetHistory(session.user.id, tenantId),
    ]);

    // Filter out null assets
    const validAssets = assetHistory.filter((a): a is NonNullable<typeof a> => a !== null);

    // Calculate stats
    const activeAssets = validAssets.filter(a => a.isCurrentlyAssigned);
    const pastAssets = validAssets.filter(a => !a.isCurrentlyAssigned);
    const activeSubscriptions = subscriptionHistory.filter(s => s.status === 'ACTIVE');
    const inactiveSubscriptions = subscriptionHistory.filter(s => s.status !== 'ACTIVE');

    const totalAssets = activeAssets.length + pastAssets.length;
    const totalSubscriptions = activeSubscriptions.length + inactiveSubscriptions.length;

    return (
      <>
        <PageHeader
          title="My Holdings"
          subtitle="All your assigned assets and subscriptions in one place"
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
          <MyHoldingsContent
            activeAssets={activeAssets}
            pastAssets={pastAssets}
            activeSubscriptions={activeSubscriptions}
            inactiveSubscriptions={inactiveSubscriptions}
          />
        </PageContent>
      </>
    );
  } catch (error) {
    console.error('Error in MyHoldingsPage:', error);
    return (
      <>
        <PageHeader
          title="My Holdings"
          subtitle="All your assigned assets and subscriptions in one place"
          breadcrumbs={[
            { label: 'Dashboard', href: '/employee' },
            { label: 'My Holdings' },
          ]}
        />
        <PageContent>
          <div className="bg-rose-50 rounded-2xl border border-rose-200 p-6">
            <p className="text-rose-600 font-medium">An error occurred while loading your holdings.</p>
            <p className="text-sm text-slate-600 mt-2">{error instanceof Error ? error.message : 'Unknown error'}</p>
          </div>
        </PageContent>
      </>
    );
  }
}
