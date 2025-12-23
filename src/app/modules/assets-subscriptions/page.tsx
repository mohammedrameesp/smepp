import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import Link from 'next/link';

export default async function AssetsSubscriptionsModule() {
  const session = await getServerSession(authOptions);

  if (process.env.NODE_ENV !== 'development' && (!session || session.user.role !== Role.ADMIN)) {
    redirect('/login');
  }

  // Get module stats
  const [totalAssets, totalSubscriptions, totalUsers] = await Promise.all([
    prisma.asset.count(),
    prisma.subscription.count(),
    prisma.user.count(),
  ]);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Asset & Subscription Management</h1>
          <p className="text-gray-600">
            Manage your company&apos;s physical assets, software subscriptions, and related resources
          </p>
        </div>

        {/* Management Sections */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Link href="/admin/assets">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-4xl">📦</div>
                  <div className="text-3xl font-bold text-gray-900">{totalAssets}</div>
                </div>
                <CardTitle>Asset Management</CardTitle>
                <CardDescription>
                  Manage physical and digital assets, track assignments, and monitor inventory
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600">
                  • Hardware & Equipment<br />
                  • Asset Assignment<br />
                  • Inventory Tracking<br />
                  • Import/Export Data
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/subscriptions">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-4xl">💳</div>
                  <div className="text-3xl font-bold text-gray-900">{totalSubscriptions}</div>
                </div>
                <CardTitle>Subscription Management</CardTitle>
                <CardDescription>
                  Track software licenses, renewals, and recurring costs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600">
                  • Software & Services<br />
                  • Renewal Tracking<br />
                  • Cost Management<br />
                  • Payment Methods
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Supporting Tools */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Supporting Tools</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Link href="/admin/users">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-3xl">👥</div>
                    <div className="text-2xl font-bold text-gray-900">{totalUsers}</div>
                  </div>
                  <CardTitle className="text-base">Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    Manage team members and assignments
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>

            <Link href="/admin/reports">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="text-3xl mb-2">📊</div>
                  <CardTitle className="text-base">Reports</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    View analytics and generate reports
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
