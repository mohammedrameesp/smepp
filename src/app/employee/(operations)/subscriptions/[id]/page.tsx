/**
 * @file page.tsx
 * @description Employee view of subscription details - read-only access
 * @module app/employee/(operations)/subscriptions/[id]
 *
 * Features:
 * - Read-only subscription detail view for all employees
 * - Comprehensive information display across multiple sections
 * - Assignment tracking with automatic date calculation from history
 * - Renewal status with visual indicators (overdue/upcoming)
 * - Full subscription lifecycle history timeline
 * - Cost breakdown with period-based calculations
 *
 * Page Route: /employee/subscriptions/[id]
 * Access: All authenticated employees (read-only)
 *
 * Data Fetched:
 * - Subscription details with assigned member info
 * - Complete subscription history with performer details
 * - Ordered history (newest first)
 *
 * Sections Displayed:
 * 1. Header: Service name, category, vendor, status badges
 * 2. Subscription Details: Basic information (name, category, vendor, account ID, payment method)
 * 3. Cost Breakdown: Billing cycle-based cost calculations (via CostBreakdown component)
 * 4. Assignment Information: Current assignee with assignment date
 * 5. Notes: Additional subscription notes (if present)
 * 6. Next Renewal: Upcoming billing date with visual indicators (sidebar)
 * 7. Key Dates: Purchase, created, updated timestamps (sidebar)
 * 8. History Timeline: Full audit trail of subscription changes (sidebar)
 *
 * Components Used:
 * - SubscriptionRenewalDisplay: Shows next renewal with countdown
 * - CostBreakdown: Calculates and displays cost analysis
 * - HistoryTimeline: Visual timeline of subscription lifecycle events
 *
 * Helper Functions:
 * - getBillingCycleBadgeVariant(): Returns badge color for billing cycle
 * - getStatusBadge(): Returns styled badge for subscription status
 * - isRenewalSoon(): Checks if renewal is within 30 days (triggers amber styling)
 *
 * Assignment Date Logic:
 * - Finds most recent REASSIGNED action matching current assignee
 * - Falls back to purchase date if user was assigned from start
 * - Supports historical assignment tracking via subscription.history
 *
 * Visual Indicators:
 * - Renewal within 30 days: Amber background and borders
 * - "Assigned to You" badge: Shown when viewing own subscription
 * - Status-based badge colors: Green (Active), Red (Cancelled)
 * - Billing cycle badges: Default (Monthly), Secondary (Yearly), Outline (One-time)
 *
 * User Experience:
 * - Single-page comprehensive view of subscription
 * - No edit/delete actions (read-only for employees)
 * - Clear visual hierarchy with icon-coded sections
 * - Conditional display (notes, assignment, renewal based on data availability)
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { SubscriptionRenewalDisplay, formatBillingCycle, HistoryTimeline, CostBreakdown } from '@/features/subscriptions';
import { formatDate, formatDateTime } from '@/lib/core/datetime';
import { PageHeader, PageContent, PageHeaderButton } from '@/components/ui/page-header';
import { Package, Calendar, DollarSign, User as UserIcon, FileText, Clock, ArrowLeft } from 'lucide-react';
import { DetailCard } from '@/components/ui/detail-card';
import { ICON_SIZES } from '@/lib/constants';
import { InfoField, InfoFieldGrid } from '@/components/ui/info-field';

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

  // Check if this subscription is assigned to the current user
  const isAssignedToMe = subscription.assignedMemberId === session.user.id;

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
        subtitle={[subscription.subscriptionTag, subscription.category || 'Subscription', subscription.vendor || 'No vendor'].filter(Boolean).join(' • ')}
        breadcrumbs={[
          { label: 'Dashboard', href: '/employee' },
          { label: 'Subscriptions', href: '/employee/subscriptions' },
          { label: subscription.serviceName }
        ]}
        actions={
          <PageHeaderButton href="/employee/subscriptions" variant="outline">
            <ArrowLeft className={ICON_SIZES.sm} />
            Back to Subscriptions
          </PageHeaderButton>
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
            <DetailCard icon={Package} iconColor="purple" title="Subscription Details" subtitle="Service information and account details">
              <InfoFieldGrid columns={2}>
                <InfoField label="Service Name" value={subscription.serviceName} />
                <InfoField label="Subscription Tag" value={subscription.subscriptionTag || 'Not assigned'} mono />
                <InfoField label="Category" value={subscription.category || 'N/A'} />
                <InfoField label="Vendor" value={subscription.vendor || 'N/A'} />
                {isAssignedToMe && (
                  <InfoField label="Account ID" value={subscription.accountId || 'N/A'} mono />
                )}
                {isAssignedToMe && (
                  <div className={isAssignedToMe ? 'col-span-2' : ''}>
                    <InfoField label="Payment Method" value={subscription.paymentMethod || 'N/A'} />
                  </div>
                )}
              </InfoFieldGrid>
            </DetailCard>

            {/* Cost Breakdown - only shown for assigned subscriptions */}
            {isAssignedToMe ? (
              <CostBreakdown subscriptionId={subscription.id} />
            ) : (
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 text-center">
                <DollarSign className={`${ICON_SIZES.xl} text-slate-400 mx-auto mb-2`} />
                <p className="text-sm text-slate-500">Cost details are only visible for subscriptions assigned to you</p>
              </div>
            )}

            {/* Assignment Info */}
            {subscription.assignedMember && (
              <DetailCard icon={UserIcon} iconColor="blue" title="Assignment Information" subtitle="Current subscription assignment">
                <div className="space-y-4">
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
                    <InfoField label="Assigned On" value={formatDate(currentUserAssignmentDate)} />
                  )}
                </div>
              </DetailCard>
            )}

            {/* Notes */}
            {subscription.notes && (
              <DetailCard icon={FileText} iconColor="indigo" title="Notes" subtitle="Additional information">
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{subscription.notes}</p>
              </DetailCard>
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
                    <Calendar className={`${ICON_SIZES.md} ${
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
            <DetailCard icon={Calendar} iconColor="blue" title="Key Dates" subtitle="Important timestamps">
              <InfoFieldGrid columns={1}>
                <InfoField label="Purchase Date" value={formatDate(subscription.purchaseDate)} size="sm" />
                <InfoField label="Created At" value={formatDateTime(subscription.createdAt)} size="sm" />
                <InfoField label="Last Updated" value={formatDateTime(subscription.updatedAt)} size="sm" />
              </InfoFieldGrid>
            </DetailCard>

            {/* History Timeline */}
            {subscription.history.length > 0 && (
              <DetailCard icon={Clock} iconColor="slate" title="History" subtitle={`${subscription.history.length} events`}>
                <HistoryTimeline history={subscription.history} />
              </DetailCard>
            )}
          </div>
        </div>
      </PageContent>
    </>
  );
}
