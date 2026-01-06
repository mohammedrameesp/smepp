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
import { SubscriptionRenewalDisplay } from '@/components/domains/operations/subscriptions/subscription-renewal-display';
import { formatDate, formatDateTime } from '@/lib/date-format';
import { formatBillingCycle } from '@/lib/utils/format-billing-cycle';
import { HistoryTimeline } from '@/components/domains/operations/subscriptions/history-timeline';
import { CostBreakdown } from '@/components/domains/operations/subscriptions/cost-breakdown';
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { Package, Calendar, DollarSign, User as UserIcon, FileText, Clock, ArrowLeft } from 'lucide-react';

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
      assignedMember: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      history: {
        include: {
          performedBy: {
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
  if (subscription.assignedMember) {
    const assignmentHistory = subscription.history
      .filter(h => h.action === 'REASSIGNED' && h.newMemberId === subscription.assignedMemberId)
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
    <>
      <PageHeader
        title={subscription.serviceName}
        subtitle={`${subscription.category || 'Subscription'} - ${subscription.vendor || 'No vendor'}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/employee' },
          { label: 'Subscriptions', href: '/employee/subscriptions' },
          { label: subscription.serviceName }
        ]}
        actions={
          <Link href="/employee/subscriptions">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Subscriptions
            </Button>
          </Link>
        }
      >
        <div className="flex flex-wrap items-center gap-3 mt-4">
          {getStatusBadge(subscription.status)}
          <Badge variant={getBillingCycleBadgeVariant(subscription.billingCycle)}>
            {formatBillingCycle(subscription.billingCycle)}
          </Badge>
          {subscription.assignedMemberId === session.user.id && (
            <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
              Assigned to You
            </Badge>
          )}
        </div>
      </PageHeader>

      <PageContent>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Package className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">Subscription Details</h2>
                  <p className="text-sm text-slate-500">Service information and account details</p>
                </div>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">Service Name</p>
                    <p className="font-semibold text-slate-900">{subscription.serviceName}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">Category</p>
                    <p className="font-semibold text-slate-900">{subscription.category || 'N/A'}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">Vendor</p>
                    <p className="font-semibold text-slate-900">{subscription.vendor || 'N/A'}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">Account ID</p>
                    <p className="font-semibold text-slate-900 font-mono text-sm">{subscription.accountId || 'N/A'}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl col-span-2">
                    <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">Payment Method</p>
                    <p className="font-semibold text-slate-900">{subscription.paymentMethod || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Cost Breakdown */}
            <CostBreakdown subscriptionId={subscription.id} />

            {/* Assignment Info */}
            {subscription.assignedMember && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <UserIcon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-slate-900">Assignment Information</h2>
                    <p className="text-sm text-slate-500">Current subscription assignment</p>
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">Assigned To</p>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900">
                        {subscription.assignedMember.name || subscription.assignedMember.email}
                      </p>
                      {subscription.assignedMemberId === session.user.id && (
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">You</Badge>
                      )}
                    </div>
                  </div>
                  {currentUserAssignmentDate && (
                    <div className="p-4 bg-slate-50 rounded-xl">
                      <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">Assigned On</p>
                      <p className="font-semibold text-slate-900">{formatDate(currentUserAssignmentDate)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            {subscription.notes && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                    <FileText className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-slate-900">Notes</h2>
                    <p className="text-sm text-slate-500">Additional information</p>
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{subscription.notes}</p>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Renewal Info */}
            {subscription.billingCycle !== 'ONE_TIME' && subscription.renewalDate && (
              <div className={`rounded-2xl border overflow-hidden ${
                isRenewalSoon(subscription.renewalDate)
                  ? 'bg-amber-50 border-amber-300'
                  : 'bg-white border-slate-200'
              }`}>
                <div className={`px-5 py-4 border-b flex items-center gap-3 ${
                  isRenewalSoon(subscription.renewalDate)
                    ? 'border-amber-200 bg-amber-100/50'
                    : 'border-slate-100'
                }`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isRenewalSoon(subscription.renewalDate)
                      ? 'bg-amber-200'
                      : 'bg-emerald-100'
                  }`}>
                    <Calendar className={`h-5 w-5 ${
                      isRenewalSoon(subscription.renewalDate)
                        ? 'text-amber-700'
                        : 'text-emerald-600'
                    }`} />
                  </div>
                  <div>
                    <h2 className={`font-semibold ${
                      isRenewalSoon(subscription.renewalDate)
                        ? 'text-amber-900'
                        : 'text-slate-900'
                    }`}>Next Renewal</h2>
                    <p className={`text-sm ${
                      isRenewalSoon(subscription.renewalDate)
                        ? 'text-amber-700'
                        : 'text-slate-500'
                    }`}>Upcoming billing date</p>
                  </div>
                </div>
                <div className="p-5">
                  <SubscriptionRenewalDisplay
                    renewalDate={subscription.renewalDate}
                    billingCycle={subscription.billingCycle}
                    status={subscription.status}
                  />
                </div>
              </div>
            )}

            {/* Key Dates */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">Key Dates</h2>
                  <p className="text-sm text-slate-500">Important timestamps</p>
                </div>
              </div>
              <div className="p-5 space-y-3">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">Purchase Date</p>
                  <p className="font-semibold text-slate-900 text-sm">{formatDate(subscription.purchaseDate)}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">Created At</p>
                  <p className="font-semibold text-slate-900 text-sm">{formatDateTime(subscription.createdAt)}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">Last Updated</p>
                  <p className="font-semibold text-slate-900 text-sm">{formatDateTime(subscription.updatedAt)}</p>
                </div>
              </div>
            </div>

            {/* History Timeline */}
            {subscription.history.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                    <Clock className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-slate-900">History</h2>
                    <p className="text-sm text-slate-500">{subscription.history.length} events</p>
                  </div>
                </div>
                <div className="p-5">
                  <HistoryTimeline history={subscription.history} />
                </div>
              </div>
            )}
          </div>
        </div>
      </PageContent>
    </>
  );
}
