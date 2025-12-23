import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { EmployeeAssetListTable } from '@/components/assets/employee-asset-list-table';

export default async function EmployeeAllAssetsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // Fetch all assets with related data
  const assetsRaw = await prisma.asset.findMany({
    include: {
      assignedUser: {
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
  const assets = assetsRaw.map(asset => ({
    ...asset,
    price: asset.price ? Number(asset.price) : null,
    priceQAR: asset.priceQAR ? Number(asset.priceQAR) : null,
  }));

  // Calculate stats
  const myAssets = assets.filter(a => a.assignedUserId === session.user.id);
  const assignedAssets = assets.filter(a => a.assignedUserId);
  const availableAssets = assets.filter(a => a.status === 'SPARE');

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">All Assets</h1>
              <p className="text-gray-600">
                Browse and search all company assets
              </p>
            </div>
            <Link href="/">
              <Button variant="outline">Back to Home</Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid md:grid-cols-2 gap-4">
            <Link href="/employee/my-assets?tab=assets">
              <Card className="cursor-pointer hover:shadow-lg hover:border-blue-400 transition-all duration-200">
                <CardHeader className="pb-2 pt-4 px-5">
                  <CardTitle className="text-sm font-medium text-gray-600">My Assets</CardTitle>
                </CardHeader>
                <CardContent className="pb-4 px-5">
                  <div className="text-3xl font-bold text-blue-600">
                    {myAssets.length}
                  </div>
                  <p className="text-sm text-gray-500">Assigned to you</p>
                  {myAssets.length > 0 && (
                    <p className="text-xs text-gray-600 mt-2 truncate">
                      {myAssets.slice(0, 3).map(a => a.model).join(', ')}
                      {myAssets.length > 3 && '...'}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>

            <Card>
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-medium text-gray-600">Available Assets</CardTitle>
              </CardHeader>
              <CardContent className="pb-4 px-5">
                <div className="text-3xl font-bold text-green-600">
                  {availableAssets.length}
                </div>
                <p className="text-sm text-gray-500">Spare assets</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Assets List with Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Company Assets ({assets.length})</CardTitle>
            <CardDescription>
              Search, filter, and browse all assets in the organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            {assets.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-4">📦</div>
                <p>No assets found</p>
              </div>
            ) : (
              <EmployeeAssetListTable assets={assets} currentUserId={session.user.id} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
