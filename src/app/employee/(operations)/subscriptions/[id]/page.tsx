// Employee subscription detail page - read-only view
// Allows all authenticated users to view subscription details

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { SubscriptionRenewalDisplay } from '@/components/subscriptions/subscription-renewal-display';
import { formatDate, formatDateTime } from '@/lib/date-format';
import { formatBillingCycle } from '@/lib/utils/format-billing-cycle';
import { HistoryTimeline } from '@/components/subscriptions/history-timeline';
import { CostBreakdown } from '@/components/subscriptions/cost-breakdown';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EmployeeSubscriptionDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  const { id } = await params;

  const subscription = await prisma.subscription.findUnique({
    where: { id },
    include: {
      assignedUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      history: {
        include: {
          performer: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!subscription) {
    notFound();
  }

  // Find when the current user was assigned
  let currentUserAssignmentDate: Date | null = null;
  if (subscription.assignedUser) {
    const assignmentHistory = subscription.history
      .filter(h => h.action === 'REASSIGNED' && h.newUserId === subscription.assignedUserId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (assignmentHistory.length > 0) {
      currentUserAssignmentDate = assignmentHistory[0].assignmentDate || assignmentHistory[0].createdAt;
    } else {
      // User was assigned from the beginning
      currentUserAssignmentDate = subscription.purchaseDate || subscription.createdAt;
    }
  }

  const getBillingCycleBadgeVariant = (cycle: string) => {
    switch (cycle) {
      case 'MONTHLY':
        return 'default';
      case 'YEARLY':
        return 'secondary';
      case 'ONE_TIME':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">Active</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const isRenewalSoon = (renewalDate: Date | null) => {
    if (!renewalDate) return false;
    const now = new Date();
    const renewal = new Date(renewalDate);
    const daysUntilRenewal = Math.floor((renewal.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilRenewal >= 0 && daysUntilRenewal <= 30;
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href="/employee/subscriptions">
            <Button variant="ghost" className="mb-4">
              ← Back
            </Button>
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{subscription.serviceName}</h1>
              <div className="flex items-center gap-2 mb-2">
                {getStatusBadge(subscription.status)}
                <Badge variant={getBillingCycleBadgeVariant(subscription.billingCycle)}>
                  {formatBillingCycle(subscription.billingCycle)}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Subscription Details</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Service Name</p>
                  <p className="font-medium">{subscription.serviceName}</p>
                </div>
                <div>
                  <p className="text-gray-500">Category</p>
                  <p className="font-medium">{subscription.category || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Vendor</p>
                  <p className="font-medium">{subscription.vendor || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Account ID</p>
                  <p className="font-medium font-mono text-xs">{subscription.accountId || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Payment Method</p>
                  <p className="font-medium">{subscription.paymentMethod || 'N/A'}</p>
                </div>
              </CardContent>
            </Card>

            {/* Cost Breakdown */}
            <CostBreakdown subscriptionId={subscription.id} />

            {/* Assignment Info */}
            {subscription.assignedUser && (
              <Card>
                <CardHeader>
                  <CardTitle>Assignment Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="text-gray-500">Assigned To</p>
                    <p className="font-medium">
                      {subscription.assignedUser.name || subscription.assignedUser.email}
                      {subscription.assignedUserId === session.user.id && (
                        <Badge variant="secondary" className="ml-2">You</Badge>
                      )}
                    </p>
                  </div>
                  {currentUserAssignmentDate && (
                    <div>
                      <p className="text-gray-500">Assigned On</p>
                      <p className="font-medium">{formatDate(currentUserAssignmentDate)}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {subscription.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{subscription.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Renewal Info */}
            {subscription.billingCycle !== 'ONE_TIME' && subscription.renewalDate && (
              <Card className={isRenewalSoon(subscription.renewalDate) ? 'border-orange-300 bg-orange-50' : ''}>
                <CardHeader>
                  <CardTitle className={isRenewalSoon(subscription.renewalDate) ? 'text-orange-900' : ''}>
                    Next Renewal
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <SubscriptionRenewalDisplay
                    renewalDate={subscription.renewalDate}
                    billingCycle={subscription.billingCycle}
                    status={subscription.status}
                  />
                </CardContent>
              </Card>
            )}

            {/* Key Dates */}
            <Card>
              <CardHeader>
                <CardTitle>Key Dates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-500">Purchase Date</p>
                  <p className="font-medium">{formatDate(subscription.purchaseDate)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Created At</p>
                  <p className="font-medium">{formatDateTime(subscription.createdAt)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Last Updated</p>
                  <p className="font-medium">{formatDateTime(subscription.updatedAt)}</p>
                </div>
              </CardContent>
            </Card>

            {/* History Timeline */}
            {subscription.history.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>History</CardTitle>
                  <CardDescription>{subscription.history.length} events</CardDescription>
                </CardHeader>
                <CardContent>
                  <HistoryTimeline history={subscription.history} />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
