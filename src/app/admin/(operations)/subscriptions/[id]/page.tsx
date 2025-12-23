import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { redirect, notFound } from 'next/navigation';
import { Role } from '@prisma/client';
import Link from 'next/link';
import { SubscriptionRenewalDisplay } from '@/components/subscriptions/subscription-renewal-display';
import { formatDate, formatDateTime } from '@/lib/date-format';
import { DeleteButton } from '@/components/delete-button';
import { formatBillingCycle } from '@/lib/utils/format-billing-cycle';
import { SubscriptionLifecycleActions } from '@/components/subscriptions/subscription-lifecycle-actions';
import { HistoryTimeline } from '@/components/subscriptions/history-timeline';
import { CostBreakdown } from '@/components/subscriptions/cost-breakdown';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function SubscriptionDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  if (process.env.NODE_ENV !== 'development' && session.user.role !== Role.ADMIN) {
    redirect('/forbidden');
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
    // Check for REASSIGNED or CREATED actions that assigned this user
    const assignmentHistory = subscription.history
      .filter(h =>
        (h.action === 'REASSIGNED' || h.action === 'CREATED') &&
        h.newUserId === subscription.assignedUserId
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (assignmentHistory.length > 0) {
      currentUserAssignmentDate = assignmentHistory[0].assignmentDate || assignmentHistory[0].createdAt;
    } else {
      // Fallback to purchase date or creation date
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
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return renewalDate <= thirtyDaysFromNow && renewalDate >= now;
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Subscription Details</h1>
              <p className="text-gray-600">
                Complete information for {subscription.serviceName}
              </p>
            </div>
            <div className="flex gap-2">
              <SubscriptionLifecycleActions
                subscriptionId={subscription.id}
                subscriptionName={subscription.serviceName}
                status={subscription.status}
                billingCycle={subscription.billingCycle}
                renewalDate={subscription.renewalDate}
              />
              <Link href={`/admin/subscriptions/${subscription.id}/edit`}>
                <Button>Edit Subscription</Button>
              </Link>
              <DeleteButton
                id={subscription.id}
                entityType="subscription"
                entityName={subscription.serviceName}
              />
              <Link href="/admin/subscriptions">
                <Button variant="outline">Back to Subscriptions</Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Service Information</CardTitle>
              <CardDescription>
                Core subscription details and service information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label>Service Name</Label>
                    <div className="text-lg font-semibold">{subscription.serviceName}</div>
                  </div>
                  <div>
                    <Label>Category</Label>
                    <div>
                      {subscription.category ? (
                        <Badge variant="secondary">{subscription.category}</Badge>
                      ) : (
                        <span className="text-gray-500">Not specified</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label>Vendor</Label>
                    <div>{subscription.vendor || 'Not specified'}</div>
                  </div>
                  <div>
                    <Label>Account ID</Label>
                    <div className="font-mono">{subscription.accountId || 'Not provided'}</div>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <div>
                      {getStatusBadge(subscription.status)}
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label>Billing Cycle</Label>
                    <div>
                      <Badge variant={getBillingCycleBadgeVariant(subscription.billingCycle)}>
                        {formatBillingCycle(subscription.billingCycle)}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label>Cost per Cycle</Label>
                    <div className="text-lg font-semibold">
                      {subscription.costPerCycle ? (
                        <div>
                          <div>
                            {subscription.costCurrency === 'USD' ? '$' : 'QAR '}{Number(subscription.costPerCycle).toFixed(2)}
                          </div>
                          {subscription.costCurrency === 'USD' ? (
                            <div className="text-sm text-gray-600 font-normal mt-1">
                              ≈ QAR {(Number(subscription.costPerCycle) * 3.64).toFixed(2)}
                            </div>
                          ) : (
                            <div className="text-sm text-gray-600 font-normal mt-1">
                              ≈ USD {(Number(subscription.costPerCycle) / 3.64).toFixed(2)}
                            </div>
                          )}
                        </div>
                      ) : 'Not specified'}
                    </div>
                  </div>
                  <div>
                    <Label>Payment Method</Label>
                    <div>
                      {subscription.paymentMethod ? (
                        <div className="flex items-center gap-2">
                          <span className="text-lg">💳</span>
                          <span>•••• {subscription.paymentMethod.slice(-4)}</span>
                        </div>
                      ) : (
                        'Not specified'
                      )}
                    </div>
                  </div>
                  <div>
                    <Label>Auto Renew</Label>
                    <div>
                      <Badge variant={subscription.autoRenew ? 'default' : 'secondary'}>
                        {subscription.autoRenew ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Billing & Renewal Information */}
          <Card>
            <CardHeader>
              <CardTitle>{subscription.billingCycle === 'ONE_TIME' ? 'Billing' : 'Billing & Renewal'}</CardTitle>
              <CardDescription>
                {subscription.billingCycle === 'ONE_TIME'
                  ? 'Purchase details for one-time subscription'
                  : 'Purchase details and renewal information'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`grid ${subscription.billingCycle === 'ONE_TIME' ? 'md:grid-cols-1' : 'md:grid-cols-2'} gap-6`}>
                <div>
                  <Label>Purchase Date</Label>
                  <div>
                    {formatDate(subscription.purchaseDate, 'Not specified')}
                  </div>
                </div>
                {subscription.billingCycle !== 'ONE_TIME' && (
                  <div>
                    <Label>Next Renewal Date</Label>
                    <SubscriptionRenewalDisplay
                      renewalDate={subscription.renewalDate}
                      billingCycle={subscription.billingCycle}
                      status={subscription.status}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Assignment Information */}
          <Card>
            <CardHeader>
              <CardTitle>Assignment</CardTitle>
              <CardDescription>
                Current user assignment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label>Assigned User</Label>
                  <div>
                    {subscription.assignedUser ? (
                      <div className="font-medium">
                        {subscription.assignedUser.name || 'Unknown User'}
                      </div>
                    ) : (
                      <span className="text-gray-500">Unassigned</span>
                    )}
                  </div>
                </div>
                <div>
                  <Label>Assignment Date</Label>
                  <div>
                    {currentUserAssignmentDate ? formatDate(currentUserAssignmentDate) : 'Not specified'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {subscription.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
                <CardDescription>
                  Additional information about this subscription
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap">{subscription.notes}</div>
              </CardContent>
            </Card>
          )}

          {/* Cost Breakdown */}
          <CostBreakdown subscriptionId={subscription.id} />

          {/* History Timeline */}
          <HistoryTimeline
            history={subscription.history}
            purchaseDate={subscription.purchaseDate}
            cancelledAt={subscription.cancelledAt}
            reactivatedAt={subscription.reactivatedAt}
          />

          {/* System Information */}
          <Card>
            <CardHeader>
              <CardTitle>System Information</CardTitle>
              <CardDescription>
                System timestamps and tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label>Created</Label>
                  <div>{formatDateTime(subscription.createdAt)}</div>
                </div>
                <div>
                  <Label>Last Updated</Label>
                  <div>{formatDateTime(subscription.updatedAt)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-sm font-medium text-gray-700 mb-1">{children}</div>;
}