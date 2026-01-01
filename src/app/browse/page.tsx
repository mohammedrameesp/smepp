import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { redirect } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { formatBillingCycle } from '@/lib/utils/format-billing-cycle';
import { formatDate } from '@/lib/date-format';

export default async function BrowsePage() {
  const session = await getServerSession(authOptions);

  if (!session && process.env.NODE_ENV !== 'development') {
    redirect('/login');
  }

  // Fetch all assets and subscriptions
  const [assets, subscriptions] = await Promise.all([
    prisma.asset.findMany({
      include: {
        assignedMember: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.subscription.findMany({
      include: {
        assignedMember: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'IN_USE':
        return 'default';
      case 'SPARE':
        return 'secondary';
      case 'REPAIR':
        return 'destructive';
      case 'DISPOSED':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Browse Assets & Subscriptions</h1>
          <p className="text-gray-600">
            View all assets and subscriptions (read-only)
          </p>
        </div>

        <div className="grid gap-8">
          {/* Assets Table */}
          <Card>
            <CardHeader>
              <CardTitle>Assets ({assets.length})</CardTitle>
              <CardDescription>
                All registered hardware and equipment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableCaption>A list of all company assets</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset Tag</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Warranty</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assets.map((asset) => (
                    <TableRow key={asset.id}>
                      <TableCell className="font-mono text-sm">
                        {asset.assetTag || 'N/A'}
                      </TableCell>
                      <TableCell className="font-medium">{asset.model}</TableCell>
                      <TableCell>{asset.type}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(asset.status)}>
                          {asset.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {asset.assignedMember ? asset.assignedMember.name || 'Unknown Member' : 'Unassigned'}
                      </TableCell>
                      <TableCell>
                        {formatDate(asset.warrantyExpiry)}
                      </TableCell>
                      <TableCell className="text-right">
                        {asset.price ? `$${asset.price}` : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Subscriptions Table */}
          <Card>
            <CardHeader>
              <CardTitle>Subscriptions ({subscriptions.length})</CardTitle>
              <CardDescription>
                All active software and service subscriptions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableCaption>A list of all company subscriptions</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service Name</TableHead>
                    <TableHead>Billing Cycle</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Renewal Date</TableHead>
                    <TableHead>Auto Renew</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.map((subscription) => (
                    <TableRow key={subscription.id}>
                      <TableCell className="font-medium">{subscription.serviceName}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {formatBillingCycle(subscription.billingCycle)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {subscription.costPerCycle ? `$${subscription.costPerCycle}` : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {subscription.assignedMember ?
                          subscription.assignedMember.name || 'Unknown Member' :
                          'Unassigned'
                        }
                      </TableCell>
                      <TableCell>
                        {formatDate(subscription.renewalDate)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={subscription.autoRenew ? 'default' : 'secondary'}>
                          {subscription.autoRenew ? 'Yes' : 'No'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}