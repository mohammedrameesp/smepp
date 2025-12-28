import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { EmployeeSubscriptionListTable } from '@/components/domains/operations/subscriptions/employee-subscription-list-table';

export default async function EmployeeSubscriptionsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  try {
    // Fetch all subscriptions with related data
    const subscriptionsRaw = await prisma.subscription.findMany({
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
    const subscriptions = subscriptionsRaw.map(sub => ({
      ...sub,
      costPerCycle: sub.costPerCycle ? Number(sub.costPerCycle) : null,
    }));

    // Calculate stats
    const mySubscriptions = subscriptions.filter(s => s.assignedUserId === session.user.id);
    const activeSubscriptions = subscriptions.filter(s => s.status === 'ACTIVE');
    const myActiveSubscriptions = mySubscriptions.filter(s => s.status === 'ACTIVE');

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">All Subscriptions</h1>
              <p className="text-gray-600">
                Browse and search all company subscriptions
              </p>
            </div>
            <Link href="/">
              <Button variant="outline">Back to Home</Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid md:grid-cols-2 gap-4">
            <Link href="/employee/my-assets?tab=subscriptions">
              <Card className="cursor-pointer hover:shadow-lg hover:border-blue-400 transition-all duration-200">
                <CardHeader className="pb-2 pt-4 px-5">
                  <CardTitle className="text-sm font-medium text-gray-600">My Subscriptions</CardTitle>
                </CardHeader>
                <CardContent className="pb-4 px-5">
                  <div className="text-3xl font-bold text-blue-600">
                    {myActiveSubscriptions.length}
                  </div>
                  <p className="text-sm text-gray-500">Active & assigned to you</p>
                  {myActiveSubscriptions.length > 0 && (
                    <p className="text-xs text-gray-600 mt-2 truncate">
                      {myActiveSubscriptions.slice(0, 3).map(s => s.serviceName).join(', ')}
                      {myActiveSubscriptions.length > 3 && '...'}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>

            <Card>
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-medium text-gray-600">Active Subscriptions</CardTitle>
              </CardHeader>
              <CardContent className="pb-4 px-5">
                <div className="text-3xl font-bold text-green-600">
                  {activeSubscriptions.length}
                </div>
                <p className="text-sm text-gray-500">Currently active</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Subscriptions List with Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Company Subscriptions ({subscriptions.length})</CardTitle>
            <CardDescription>
              Search, filter, and browse all subscriptions in the organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            {subscriptions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-4">📦</div>
                <p>No subscriptions found</p>
              </div>
            ) : (
              <EmployeeSubscriptionListTable subscriptions={subscriptions} currentUserId={session.user.id} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
  } catch (error) {
    console.error('Error in EmployeeSubscriptionsPage:', error);
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Error Loading Subscriptions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-600">An error occurred while loading subscriptions. Please try again later.</p>
              <p className="text-sm text-gray-600 mt-2">{error instanceof Error ? error.message : 'Unknown error'}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
}
