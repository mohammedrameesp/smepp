/**
 * @file page.tsx
 * @description Subscription detail view page with full information
 * @module app/admin/(operations)/subscriptions/[id]
 *
 * Features:
 * - Complete subscription details display
 * - Status badge with color coding
 * - Assigned member information
 * - Cost breakdown by active periods
 * - Full history timeline with all changes
 * - Lifecycle actions (cancel/reactivate)
 * - Edit and delete buttons
 * - Currency-aware cost display
 *
 * Page Route: /admin/subscriptions/[id]
 * Access: Admin-only
 *
 * Sections:
 * 1. Header with service name and status
 * 2. Basic info (vendor, category, dates, costs)
 * 3. Assignment info (member, dates)
 * 4. Cost breakdown card (periods and totals)
 * 5. History timeline (audit trail)
 * 6. Action buttons (edit, delete, cancel/reactivate)
 *
 * Components Used:
 * - SubscriptionRenewalDisplay: Renewal date with urgency badge
 * - CostBreakdown: Period-by-period cost analysis
 * - HistoryTimeline: Complete audit trail
 * - SubscriptionLifecycleActions: Cancel/reactivate buttons
 * - DeleteButton: Subscription deletion with confirmation
 */
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { Button } from '@/components/ui/button';
import { redirect, notFound } from 'next/navigation';

import Link from 'next/link';
import { SubscriptionRenewalDisplay, formatBillingCycle, SubscriptionLifecycleActions, HistoryTimeline, CostBreakdown } from '@/features/subscriptions';
import { formatDate, formatDateTime } from '@/lib/core/datetime';
import { formatCurrency } from '@/lib/core/currency';
import { DeleteButton } from '@/components/shared/delete-button';
import {
  CreditCard,
  DollarSign,
  User,
  Calendar,
  Clock,
  FileText,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { PageHeader, PageHeaderButton, PageContent } from '@/components/ui/page-header';
import { DetailCard } from '@/components/ui/detail-card';
import { InfoField, InfoFieldGrid } from '@/components/ui/info-field';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function SubscriptionDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  if (process.env.NODE_ENV !== 'development' && session.user.teamMemberRole !== 'ADMIN') {
    redirect('/forbidden');
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

  // Find when the current member was assigned
  let currentMemberAssignmentDate: Date | null = null;
  if (subscription.assignedMember) {
    const assignmentHistory = subscription.history
      .filter(h =>
        (h.action === 'REASSIGNED' || h.action === 'CREATED') &&
        h.newMemberId === subscription.assignedMemberId
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (assignmentHistory.length > 0) {
      currentMemberAssignmentDate = assignmentHistory[0].assignmentDate || assignmentHistory[0].createdAt;
    } else {
      currentMemberAssignmentDate = subscription.purchaseDate || subscription.createdAt;
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
        subtitle={[subscription.subscriptionTag, subscription.vendor, subscription.category].filter(Boolean).join(' • ')}
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
          <DetailCard icon={CreditCard} iconColor="blue" title="Service Information" subtitle="Subscription details">
            <InfoFieldGrid columns={2}>
              <InfoField label="Service Name" value={subscription.serviceName} />
              <InfoField label="Subscription Tag" value={subscription.subscriptionTag} mono />
              <InfoField label="Vendor" value={subscription.vendor} />
              <InfoField label="Category" value={subscription.category} />
              <InfoField label="Account ID" value={subscription.accountId} mono />
            </InfoFieldGrid>
          </DetailCard>

          {/* Billing Information */}
          <DetailCard icon={DollarSign} iconColor="emerald" title="Billing Information" subtitle="Cost and payment details">
            <InfoFieldGrid columns={2}>
              <div className="p-4 bg-emerald-50 rounded-xl">
                <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide mb-1">Cost per Cycle</p>
                {subscription.costPerCycle ? (
                  <>
                    <p className="font-bold text-lg text-emerald-700">
                      {formatCurrency(Number(subscription.costPerCycle), subscription.costCurrency)}
                    </p>
                    {subscription.costCurrency !== 'QAR' && subscription.costQAR && (
                      <p className="text-xs text-emerald-600">
                        ≈ {formatCurrency(Number(subscription.costQAR), 'QAR')}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="font-semibold text-slate-900">Not specified</p>
                )}
              </div>
              <InfoField label="Billing Cycle" value={formatBillingCycle(subscription.billingCycle)} />
              <InfoField
                label="Payment Method"
                value={subscription.paymentMethod ? `•••• ${subscription.paymentMethod.slice(-4)}` : null}
              />
              <InfoField
                label="Auto Renew"
                value={
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    subscription.autoRenew ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {subscription.autoRenew ? 'Enabled' : 'Disabled'}
                  </span>
                }
              />
            </InfoFieldGrid>
          </DetailCard>

          {/* Dates */}
          <DetailCard
            icon={Calendar}
            iconColor="purple"
            title={subscription.billingCycle === 'ONE_TIME' ? 'Purchase Date' : 'Dates & Renewal'}
          >
            <InfoFieldGrid columns={subscription.billingCycle === 'ONE_TIME' ? 1 : 2}>
              <InfoField label="Purchase Date" value={formatDate(subscription.purchaseDate, 'Not specified')} />
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
            </InfoFieldGrid>
          </DetailCard>

          {/* Notes */}
          {subscription.notes && (
            <DetailCard icon={FileText} iconColor="amber" title="Notes">
              <div className="p-4 bg-slate-50 rounded-xl text-slate-700 whitespace-pre-wrap">
                {subscription.notes}
              </div>
            </DetailCard>
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
          <DetailCard icon={User} iconColor="indigo" title="Assignment">
            {subscription.assignedMember ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                    <span className="text-indigo-600 font-semibold">
                      {subscription.assignedMember.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??'}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{subscription.assignedMember.name || 'Unknown User'}</p>
                    <p className="text-sm text-slate-500">{subscription.assignedMember.email}</p>
                  </div>
                </div>
                {currentMemberAssignmentDate && (
                  <div className="p-3 bg-slate-50 rounded-xl mb-4">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Assigned Since</p>
                    <p className="font-medium text-slate-900">{formatDate(currentMemberAssignmentDate)}</p>
                  </div>
                )}
                <Link href={`/admin/employees/${subscription.assignedMember.id}`}>
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
          </DetailCard>

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
          <DetailCard icon={Clock} iconColor="slate" title="System Info">
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Created</p>
                <p className="text-sm text-slate-700">{formatDateTime(subscription.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Last Updated</p>
                <p className="text-sm text-slate-700">{formatDateTime(subscription.updatedAt)}</p>
              </div>
            </div>
          </DetailCard>
        </div>
        </div>
      </PageContent>
    </>
  );
}
