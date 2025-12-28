import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { redirect, notFound } from 'next/navigation';
import { Role } from '@prisma/client';
import Link from 'next/link';
import { SubscriptionRenewalDisplay } from '@/components/domains/operations/subscriptions/subscription-renewal-display';
import { formatDate, formatDateTime } from '@/lib/date-format';
import { DeleteButton } from '@/components/delete-button';
import { formatBillingCycle } from '@/lib/utils/format-billing-cycle';
import { SubscriptionLifecycleActions } from '@/components/domains/operations/subscriptions/subscription-lifecycle-actions';
import { HistoryTimeline } from '@/components/domains/operations/subscriptions/history-timeline';
import { CostBreakdown } from '@/components/domains/operations/subscriptions/cost-breakdown';
import {
  CreditCard,
  DollarSign,
  User,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
} from 'lucide-react';
import { PageHeader, PageHeaderButton, PageContent } from '@/components/ui/page-header';

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
    const assignmentHistory = subscription.history
      .filter(h =>
        (h.action === 'REASSIGNED' || h.action === 'CREATED') &&
        h.newUserId === subscription.assignedUserId
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (assignmentHistory.length > 0) {
      currentUserAssignmentDate = assignmentHistory[0].assignmentDate || assignmentHistory[0].createdAt;
    } else {
      currentUserAssignmentDate = subscription.purchaseDate || subscription.createdAt;
    }
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle };
      case 'CANCELLED':
        return { bg: 'bg-rose-100', text: 'text-rose-700', icon: XCircle };
      default:
        return { bg: 'bg-slate-100', text: 'text-slate-700', icon: Clock };
    }
  };

  const statusStyle = getStatusStyle(subscription.status);
  const statusBadgeVariant = subscription.status === 'ACTIVE' ? 'success' :
    subscription.status === 'CANCELLED' ? 'error' : 'default';

  return (
    <>
      <PageHeader
        title={subscription.serviceName}
        subtitle={[subscription.vendor, subscription.category].filter(Boolean).join(' • ')}
        breadcrumbs={[
          { label: 'Subscriptions', href: '/admin/subscriptions' },
          { label: subscription.serviceName },
        ]}
        badge={{ text: subscription.status, variant: statusBadgeVariant }}
        actions={
          <div className="flex gap-2 flex-wrap">
            <SubscriptionLifecycleActions
              subscriptionId={subscription.id}
              subscriptionName={subscription.serviceName}
              status={subscription.status}
              billingCycle={subscription.billingCycle}
              renewalDate={subscription.renewalDate}
            />
            <PageHeaderButton href={`/admin/subscriptions/${subscription.id}/edit`} variant="primary">
              Edit
            </PageHeaderButton>
            <DeleteButton
              id={subscription.id}
              entityType="subscription"
              entityName={subscription.serviceName}
            />
          </div>
        }
      />

      <PageContent>
        <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Service Information */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Service Information</h2>
                <p className="text-sm text-slate-500">Subscription details</p>
              </div>
            </div>
            <div className="p-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Service Name</p>
                  <p className="font-semibold text-slate-900">{subscription.serviceName}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Vendor</p>
                  <p className="font-semibold text-slate-900">{subscription.vendor || 'Not specified'}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Category</p>
                  <p className="font-semibold text-slate-900">{subscription.category || 'Not specified'}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Account ID</p>
                  <p className="font-mono font-semibold text-slate-900">{subscription.accountId || 'Not provided'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Billing Information */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Billing Information</h2>
                <p className="text-sm text-slate-500">Cost and payment details</p>
              </div>
            </div>
            <div className="p-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 bg-emerald-50 rounded-xl">
                  <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide mb-1">Cost per Cycle</p>
                  {subscription.costPerCycle ? (
                    <>
                      <p className="font-bold text-lg text-emerald-700">
                        {subscription.costCurrency === 'USD' ? '$' : 'QAR '}{Number(subscription.costPerCycle).toFixed(2)}
                      </p>
                      <p className="text-xs text-emerald-600">
                        {subscription.costCurrency === 'USD'
                          ? `≈ QAR ${(Number(subscription.costPerCycle) * 3.64).toFixed(2)}`
                          : `≈ USD ${(Number(subscription.costPerCycle) / 3.64).toFixed(2)}`
                        }
                      </p>
                    </>
                  ) : (
                    <p className="font-semibold text-slate-900">Not specified</p>
                  )}
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Billing Cycle</p>
                  <p className="font-semibold text-slate-900">{formatBillingCycle(subscription.billingCycle)}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Payment Method</p>
                  <p className="font-semibold text-slate-900">
                    {subscription.paymentMethod ? `•••• ${subscription.paymentMethod.slice(-4)}` : 'Not specified'}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Auto Renew</p>
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    subscription.autoRenew ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {subscription.autoRenew ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <h2 className="font-semibold text-slate-900">
                {subscription.billingCycle === 'ONE_TIME' ? 'Purchase Date' : 'Dates & Renewal'}
              </h2>
            </div>
            <div className="p-5">
              <div className={`grid ${subscription.billingCycle === 'ONE_TIME' ? 'sm:grid-cols-1' : 'sm:grid-cols-2'} gap-4`}>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Purchase Date</p>
                  <p className="font-semibold text-slate-900">{formatDate(subscription.purchaseDate, 'Not specified')}</p>
                </div>
                {subscription.billingCycle !== 'ONE_TIME' && (
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Next Renewal</p>
                    <SubscriptionRenewalDisplay
                      renewalDate={subscription.renewalDate}
                      billingCycle={subscription.billingCycle}
                      status={subscription.status}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          {subscription.notes && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                  <FileText className="h-5 w-5 text-amber-600" />
                </div>
                <h2 className="font-semibold text-slate-900">Notes</h2>
              </div>
              <div className="p-5">
                <div className="p-4 bg-slate-50 rounded-xl text-slate-700 whitespace-pre-wrap">
                  {subscription.notes}
                </div>
              </div>
            </div>
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
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Assignment */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <User className="h-5 w-5 text-indigo-600" />
              </div>
              <h2 className="font-semibold text-slate-900">Assignment</h2>
            </div>
            <div className="p-5">
              {subscription.assignedUser ? (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                      <span className="text-indigo-600 font-semibold">
                        {subscription.assignedUser.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??'}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{subscription.assignedUser.name || 'Unknown User'}</p>
                      <p className="text-sm text-slate-500">{subscription.assignedUser.email}</p>
                    </div>
                  </div>
                  {currentUserAssignmentDate && (
                    <div className="p-3 bg-slate-50 rounded-xl mb-4">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Assigned Since</p>
                      <p className="font-medium text-slate-900">{formatDate(currentUserAssignmentDate)}</p>
                    </div>
                  )}
                  <Link href={`/admin/users/${subscription.assignedUser.id}`}>
                    <Button variant="outline" size="sm" className="w-full">
                      View Profile
                    </Button>
                  </Link>
                </>
              ) : (
                <div className="text-center py-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <User className="h-6 w-6 text-slate-400" />
                  </div>
                  <p className="text-slate-500 text-sm">Unassigned</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Quick Info</h2>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Status</span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                  {subscription.status}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Billing</span>
                <span className="font-semibold text-slate-900">{formatBillingCycle(subscription.billingCycle)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Currency</span>
                <span className="font-semibold text-slate-900">{subscription.costCurrency || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* System Information */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                <Clock className="h-5 w-5 text-slate-600" />
              </div>
              <h2 className="font-semibold text-slate-900">System Info</h2>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Created</p>
                <p className="text-sm text-slate-700">{formatDateTime(subscription.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Last Updated</p>
                <p className="text-sm text-slate-700">{formatDateTime(subscription.updatedAt)}</p>
              </div>
            </div>
          </div>
        </div>
        </div>
      </PageContent>
    </>
  );
}
