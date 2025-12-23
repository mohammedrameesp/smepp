import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { redirect } from 'next/navigation';
import { getUserSubscriptionHistory } from '@/lib/subscription-lifecycle';
import { getUserAssetHistory } from '@/lib/asset-lifecycle';
import { UserSubscriptionHistory } from '@/components/users/user-subscription-history';
import { UserAssetHistory } from '@/components/users/user-asset-history';

export default async function MePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // Fetch user's assets and subscriptions
  let user = await prisma.user.findUnique({
    where: { email: session.user.email || '' },
    include: {
      assets: true,
      subscriptions: true,
    },
  });

  // If user doesn't exist in database but has a valid session, create them
  if (!user && session.user.email) {
    try {
      user = await prisma.user.create({
        data: {
          email: session.user.email,
          name: session.user.name || session.user.email.split('@')[0],
          role: session.user.role || 'EMPLOYEE',
          image: session.user.image,
        },
        include: {
          assets: true,
          subscriptions: true,
        },
      });
    } catch (error) {
      console.error('Failed to create user:', error);
      return (
        <div className="container mx-auto py-8 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Error Creating Account</h1>
            <p className="text-gray-600 mb-4">
              Failed to create your account ({session.user.email}) in the system.
            </p>
            <p className="text-sm text-gray-500">
              Please contact your administrator or try signing in again.
            </p>
          </div>
        </div>
      );
    }
  }

  if (!user) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">User Not Found</h1>
          <p className="text-gray-600 mb-4">
            Your account ({session.user.email}) doesn&apos;t exist in the system yet.
          </p>
          <p className="text-sm text-gray-500">
            Please contact your administrator to create your account or wait for it to be set up.
          </p>
        </div>
      </div>
    );
  }

  // Get complete subscription history (including inactive ones)
  const subscriptionHistory = await getUserSubscriptionHistory(user.id);

  // Get complete asset history (including past assignments)
  const assetHistory = await getUserAssetHistory(user.id);

  // Count active items
  const activeAssetsCount = assetHistory.filter(a => a && a.isCurrentlyAssigned).length;
  const activeSubscriptionsCount = subscriptionHistory.filter(s => s && s.status === 'ACTIVE').length;
  const totalActiveItems = activeAssetsCount + activeSubscriptionsCount;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header with summary stats */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">My Dashboard</h1>
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              <span className="text-gray-600">
                <span className="font-semibold text-gray-900">{totalActiveItems}</span> active items
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">
                <span className="font-semibold text-gray-900">{activeAssetsCount}</span> assets
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">
                <span className="font-semibold text-gray-900">{activeSubscriptionsCount}</span> subscriptions
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Asset History with Timeline */}
          <UserAssetHistory assets={assetHistory as any} viewMode="employee" />

          {/* Subscription History with Timeline */}
          <UserSubscriptionHistory subscriptions={subscriptionHistory as any} viewMode="employee" />
        </div>
      </div>
    </div>
  );
}