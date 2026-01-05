import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getMemberSubscriptionHistory } from '@/lib/subscription-lifecycle';
import { getUserAssetHistory } from '@/lib/asset-lifecycle';
import { UserSubscriptionHistory, UserAssetHistory } from '@/components/domains/system/users';

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
    const assetHistory = await getUserAssetHistory(session.user.id, tenantId);

    // Calculate stats
    const activeAssets = assetHistory.filter((a: any) => a.isCurrentlyAssigned);
    const activeSubscriptions = subscriptionHistory.filter((s: any) => s.status === 'ACTIVE');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">My Holdings</h1>
                <p className="text-gray-600">
                  View all assets and subscriptions assigned to you
                </p>
              </div>
              <Link href="/">
                <Button variant="outline">Back to Home</Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2 pt-4 px-5">
                  <CardTitle className="text-sm font-medium text-gray-600">Active Assets</CardTitle>
                </CardHeader>
                <CardContent className="pb-4 px-5">
                  <div className="text-3xl font-bold text-blue-600">{activeAssets.length}</div>
                  <p className="text-sm text-gray-500">Currently assigned</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 pt-4 px-5">
                  <CardTitle className="text-sm font-medium text-gray-600">Active Subscriptions</CardTitle>
                </CardHeader>
                <CardContent className="pb-4 px-5">
                  <div className="text-3xl font-bold text-emerald-600">{activeSubscriptions.length}</div>
                  <p className="text-sm text-gray-500">Currently active</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Subscription History */}
          <UserSubscriptionHistory subscriptions={subscriptionHistory as any} viewMode="employee" />

          {/* Asset History */}
          <UserAssetHistory assets={assetHistory as any} viewMode="employee" />
        </div>
      </div>
    </div>
  );
  } catch (error) {
    console.error('Error in MyHoldingsPage:', error);
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto py-8 px-4">
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Error Loading Holdings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-red-600">An error occurred while loading your holdings. Please try again later.</p>
                <p className="text-sm text-gray-600 mt-2">{error instanceof Error ? error.message : 'Unknown error'}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }
}
