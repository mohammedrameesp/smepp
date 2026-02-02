/**
 * @module app/employee
 * @description Employee Dashboard - the main landing page for employee portal.
 *
 * This server component displays a comprehensive dashboard with personalized
 * information for the logged-in employee. It fetches and aggregates data from
 * multiple sources in parallel for optimal performance.
 *
 * Features:
 * - Personalized greeting with time of day and employee tenure
 * - Leave balance summary with accrual calculations
 * - Asset and subscription holdings overview
 * - Pending requests summary (leave, spend, asset requests)
 * - Document expiry alerts (QID, passport, health card)
 * - Team celebrations (birthdays and work anniversaries)
 * - Quick actions and navigation for mobile
 * - Admin employee-view mode support
 *
 * Data Sources:
 * - TeamMember profile with HR fields
 * - Leave balances and requests
 * - Asset assignments and requests
 * - Subscription assignments
 * - Spend requests
 *
 * @see getMemberSubscriptionHistory - Fetches subscription assignments
 * @see getMemberAssetHistory - Fetches asset assignments
 */
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import {
  Palmtree,
  Laptop,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';
import { getMemberSubscriptionHistory, getNextRenewalDate, getDaysUntilRenewal } from '@/features/subscriptions';
import { getMemberAssetHistory } from '@/features/assets';
import { getAnnualLeaveDetails } from '@/features/leave/lib/leave-utils';
import { format } from 'date-fns';
import {
  AlertBanner,
  AssetAssignmentAlert,
  CelebrationsCard,
  RequestsCard,
  LeaveBalanceWidget,
  HoldingsCard,
  UpcomingCard,
  QuickActions,
} from '@/components/employee/dashboard';
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { StatChip, StatChipGroup } from '@/components/ui/stat-chip';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatTenure(dateOfJoining: Date | null): string | null {
  if (!dateOfJoining) return null;

  const now = new Date();
  const joinDate = new Date(dateOfJoining);

  let years = now.getFullYear() - joinDate.getFullYear();
  let months = now.getMonth() - joinDate.getMonth();
  let days = now.getDate() - joinDate.getDate();

  // Adjust for negative days
  if (days < 0) {
    months--;
    // Get days in previous month
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += prevMonth.getDate();
  }

  // Adjust for negative months
  if (months < 0) {
    years--;
    months += 12;
  }

  const parts: string[] = [];
  if (years > 0) parts.push(`${years} year${years !== 1 ? 's' : ''}`);
  if (months > 0) parts.push(`${months} month${months !== 1 ? 's' : ''}`);
  if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);

  if (parts.length === 0) return 'Today';

  return parts.join(', ');
}

export default async function EmployeeDashboard() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.organizationId) {
    redirect('/login');
  }

  // Redirect admins to the admin dashboard (unless they're in employee view mode)
  if (session.user.isAdmin === true) {
    const cookieStore = await cookies();
    const viewModeCookie = cookieStore.get('durj-view-mode');
    const isEmployeeViewMode = viewModeCookie?.value === 'employee';

    if (!isEmployeeViewMode) {
      redirect('/admin');
    }
  }

  try {
    // Get organization ID from session (session.user.id is now the TeamMember ID)
    const organizationId = session.user.organizationId

    // Get all data in parallel
    const [
      subscriptionHistory,
      assetHistory,
      spendRequests,
      memberProfile,
      leaveRequests,
      leaveBalances,
      assetRequests,
      pendingAssetAssignments,
      celebrations,
    ] = await Promise.all([
      getMemberSubscriptionHistory(session.user.id),
      getMemberAssetHistory(session.user.id, organizationId),
      prisma.spendRequest.findMany({
        where: { requesterId: session.user.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          _count: { select: { items: true } },
        },
      }),
      // TeamMember has HR fields directly (no separate HRProfile)
      prisma.teamMember.findUnique({
        where: { id: session.user.id },
        select: {
          qidNumber: true,
          qidExpiry: true,
          passportNumber: true,
          passportExpiry: true,
          healthCardExpiry: true,
          dateOfJoining: true,
          dateOfBirth: true,
        },
      }),
      prisma.leaveRequest.findMany({
        where: { memberId: session.user.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          leaveType: {
            select: { id: true, name: true, color: true },
          },
        },
      }),
      prisma.leaveBalance.findMany({
        where: {
          memberId: session.user.id,
          year: new Date().getFullYear(),
        },
        include: {
          leaveType: {
            select: { id: true, name: true, color: true, category: true },
          },
        },
      }),
      prisma.assetRequest.findMany({
        where: { memberId: session.user.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          asset: { select: { model: true, assetTag: true, brand: true } },
        },
      }),
      // Count of pending asset assignments awaiting user acceptance
      prisma.assetRequest.count({
        where: {
          memberId: session.user.id,
          status: 'PENDING_USER_ACCEPTANCE',
        },
      }),
      // Fetch celebrations (birthdays and anniversaries this week)
      organizationId
        ? prisma.teamMember.findMany({
            where: {
              tenantId: organizationId,
              OR: [
                { dateOfBirth: { not: null } },
                { dateOfJoining: { not: null } },
              ],
            },
            select: {
              id: true,
              name: true,
              dateOfBirth: true,
              dateOfJoining: true,
            },
          })
        : Promise.resolve([]),
    ]);

    // Calculate stats
    const activeAssets = assetHistory.filter((a) => a && a.isCurrentlyAssigned);
    const activeSubscriptions = subscriptionHistory.filter((s) => s.status === 'ACTIVE');
    const pendingSpendRequests = spendRequests.filter((pr) => pr.status === 'PENDING');
    const pendingLeaveRequests = leaveRequests.filter((lr) => lr.status === 'PENDING');
    const pendingAssetRequests = assetRequests.filter((ar) => ar.status === 'PENDING_ADMIN_APPROVAL');
    const approvedLeaveRequests = leaveRequests.filter((lr) => lr.status === 'APPROVED');

    const totalPendingRequests = pendingSpendRequests.length + pendingLeaveRequests.length + pendingAssetRequests.length;

    // Calculate total available leave days
    const dateOfJoining = memberProfile?.dateOfJoining;
    const currentYear = new Date().getFullYear();
    const now = new Date();

    const totalAvailableLeaveDays = leaveBalances
      .filter((b) => b.leaveType.category === 'STANDARD' || b.leaveType.category === 'MEDICAL')
      .reduce((sum, b) => {
        let effectiveEntitlement = Number(b.entitlement);
        if (b.leaveType.name === 'Annual Leave' && dateOfJoining) {
          const annualDetails = getAnnualLeaveDetails(dateOfJoining, currentYear, now);
          effectiveEntitlement = annualDetails.accrued;
        }
        return sum + (effectiveEntitlement - Number(b.used) + Number(b.carriedForward) + Number(b.adjustment) - Number(b.pending));
      }, 0);

    // Process celebrations
    const today = new Date();
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    interface CelebrationItem {
      id: string;
      name: string;
      type: 'birthday' | 'anniversary';
      date: Date;
      years?: number;
    }

    const processedCelebrations = celebrations
      .map((member) => {
        const results: CelebrationItem[] = [];

        // Check birthday
        if (member.dateOfBirth) {
          const birthday = new Date(member.dateOfBirth);
          const thisYearBirthday = new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate());
          if (thisYearBirthday >= today && thisYearBirthday <= weekFromNow) {
            results.push({
              id: `birthday-${member.id}`,
              name: member.name || 'Team member',
              type: 'birthday' as const,
              date: thisYearBirthday,
            });
          }
        }

        // Check work anniversary
        if (member.dateOfJoining) {
          const joinDate = new Date(member.dateOfJoining);
          const years = today.getFullYear() - joinDate.getFullYear();
          if (years > 0) {
            const anniversary = new Date(today.getFullYear(), joinDate.getMonth(), joinDate.getDate());
            if (anniversary >= today && anniversary <= weekFromNow) {
              results.push({
                id: `anniversary-${member.id}`,
                name: member.name || 'Team member',
                type: 'anniversary' as const,
                date: anniversary,
                years,
              });
            }
          }
        }

        return results;
      })
      .flat()
      .filter((c) => c.name !== session.user.name) // Exclude self
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    // Document alerts
    const documentAlerts: { type: string; expiry: Date; daysLeft: number }[] = [];
    if (memberProfile) {
      const checkExpiry = (date: Date | null, type: string) => {
        if (date) {
          const daysLeft = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (daysLeft <= 90) {
            documentAlerts.push({ type, expiry: date, daysLeft });
          }
        }
      };
      checkExpiry(memberProfile.qidExpiry, 'QID');
      checkExpiry(memberProfile.passportExpiry, 'Passport');
      checkExpiry(memberProfile.healthCardExpiry, 'Health Card');
    }
    documentAlerts.sort((a, b) => a.daysLeft - b.daysLeft);

    // Upcoming renewals
    const upcomingRenewals = activeSubscriptions
      .map((sub) => {
        if (!sub.currentPeriod?.renewalDate) return null;
        const nextRenewal = getNextRenewalDate(sub.currentPeriod.renewalDate, sub.billingCycle);
        const daysUntil = getDaysUntilRenewal(nextRenewal);
        if (daysUntil === null || daysUntil > 30) return null;
        return { ...sub, nextRenewalDate: nextRenewal, daysUntilRenewal: daysUntil };
      })
      .filter(Boolean);

    // Transform data for components
    const unifiedRequests = [
      ...spendRequests.slice(0, 3).map((pr) => ({
        id: pr.id,
        type: 'purchase' as const,
        title: pr.title,
        referenceNumber: pr.referenceNumber,
        status: pr.status,
        subtitle: `${pr._count.items} item(s)`,
        createdAt: pr.createdAt,
      })),
      ...leaveRequests.slice(0, 3).map((lr) => ({
        id: lr.id,
        type: 'leave' as const,
        title: lr.leaveType.name,
        referenceNumber: lr.requestNumber || `LR-${lr.id.slice(0, 6)}`,
        status: lr.status,
        subtitle: `${Number(lr.totalDays)} day(s)`,
        createdAt: lr.createdAt,
        color: lr.leaveType.color,
      })),
      ...assetRequests.slice(0, 2).map((ar) => ({
        id: ar.id,
        type: 'asset' as const,
        title: ar.asset?.model || 'Asset Request',
        referenceNumber: ar.requestNumber || `AR-${ar.id.slice(0, 6)}`,
        status: ar.status,
        subtitle: ar.asset?.assetTag || '',
        createdAt: ar.createdAt,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const leaveBalanceData = leaveBalances
      .filter((b) => b.leaveType.category === 'STANDARD' || b.leaveType.category === 'MEDICAL')
      .map((b) => {
        let effectiveEntitlement = Number(b.entitlement);
        let isAccrual = false;
        if (b.leaveType.name === 'Annual Leave' && dateOfJoining) {
          const annualDetails = getAnnualLeaveDetails(dateOfJoining, currentYear, now);
          effectiveEntitlement = annualDetails.accrued;
          isAccrual = true;
        }
        const available = effectiveEntitlement - Number(b.used) + Number(b.carriedForward) + Number(b.adjustment) - Number(b.pending);
        return {
          id: b.id,
          leaveTypeName: b.leaveType.name,
          color: b.leaveType.color,
          available: Math.max(0, available),
          total: effectiveEntitlement,
          isAccrual,
        };
      });

    const assetsData = activeAssets.filter((a): a is NonNullable<typeof a> => a !== null).map((a) => ({
      id: a.id,
      name: a.model,
      code: a.assetTag || '',
      type: a.type,
    }));

    const upcomingEvents = [
      ...approvedLeaveRequests
        .filter((lr) => new Date(lr.startDate) >= today)
        .slice(0, 2)
        .map((lr) => ({
          id: lr.id,
          type: 'leave' as const,
          title: lr.leaveType.name,
          date: lr.startDate,
          endDate: lr.endDate,
          subtitle: `${Number(lr.totalDays)} days`,
          color: lr.leaveType.color,
        })),
      ...upcomingRenewals.filter((sub): sub is NonNullable<typeof sub> => sub !== null && sub.nextRenewalDate !== null).slice(0, 2).map((sub) => ({
        id: sub.id,
        type: 'renewal' as const,
        title: sub.serviceName,
        date: sub.nextRenewalDate!,
        subtitle: sub.costPerCycle ? `QAR ${sub.costPerCycle}/${sub.billingCycle?.toLowerCase()}` : undefined,
      })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate tenure
    const tenure = formatTenure(memberProfile?.dateOfJoining || null);

    return (
      <>
        <PageHeader
          title={`${getGreeting()}, ${session.user.name?.split(' ')[0]}!`}
          subtitle={tenure ? `${format(new Date(), 'EEEE, MMMM d, yyyy')} • ${tenure} with the company` : format(new Date(), 'EEEE, MMMM d, yyyy')}
        >
          <StatChipGroup className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
            <StatChip
              value={totalAvailableLeaveDays.toFixed(1)}
              label="leave days"
              color="blue"
              icon={<Palmtree className={ICON_SIZES.sm} />}
            />
            <StatChip
              value={activeAssets.length}
              label="assets"
              color="emerald"
              icon={<Laptop className={ICON_SIZES.sm} />}
            />
            <StatChip
              value={totalPendingRequests}
              label="pending"
              color="purple"
              icon={<Clock className={ICON_SIZES.sm} />}
            />
            <StatChip
              value={documentAlerts.length}
              label={documentAlerts.length === 1 ? 'alert' : 'alerts'}
              color="amber"
              icon={<AlertTriangle className={ICON_SIZES.sm} />}
              hideWhenZero
            />
          </StatChipGroup>
        </PageHeader>

        <PageContent>
          {/* Alert Banner */}
          <AlertBanner alerts={documentAlerts} className="mb-4" />

          {/* Asset Assignment Alert */}
          <AssetAssignmentAlert pendingCount={pendingAssetAssignments} className="mb-4" />

          {/* Celebrations */}
          <CelebrationsCard celebrations={processedCelebrations} className="mb-4" />

          {/* Mobile Layout: Stacked */}
          <div className="lg:hidden space-y-4">
            <RequestsCard requests={unifiedRequests} />
            <LeaveBalanceWidget balances={leaveBalanceData} year={currentYear} />
            <HoldingsCard assets={assetsData} subscriptionCount={activeSubscriptions.length} />
            <UpcomingCard events={upcomingEvents} />
          </div>

          {/* Desktop Layout: 3 columns */}
          <div className="hidden lg:grid lg:grid-cols-3 gap-6 mb-6">
            <LeaveBalanceWidget balances={leaveBalanceData} year={currentYear} />
            <RequestsCard requests={unifiedRequests} />
            <CelebrationsCard celebrations={processedCelebrations} className="hidden lg:block" />
          </div>

          <div className="hidden lg:grid lg:grid-cols-3 gap-6">
            <HoldingsCard assets={assetsData} subscriptionCount={activeSubscriptions.length} />
            <UpcomingCard events={upcomingEvents} />
            <QuickActions />
          </div>
        </PageContent>

        {/* Mobile Bottom Navigation */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50">
          <div className="grid grid-cols-4 gap-1 p-2">
            <Link href="/employee/leave/new" className="flex flex-col items-center py-2 px-1 rounded-lg hover:bg-blue-50 text-blue-600">
              <Palmtree className={`${ICON_SIZES.md} mb-1`} />
              <span className="text-xs font-medium">Leave</span>
            </Link>
            <Link href="/employee/spend-requests/new" className="flex flex-col items-center py-2 px-1 rounded-lg hover:bg-violet-50 text-gray-500 hover:text-violet-600">
              <svg className="h-5 w-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="text-xs font-medium">Purchase</span>
            </Link>
            <Link href="/employee/my-assets" className="flex flex-col items-center py-2 px-1 rounded-lg hover:bg-emerald-50 text-gray-500 hover:text-emerald-600">
              <Laptop className={`${ICON_SIZES.md} mb-1`} />
              <span className="text-xs font-medium">Assets</span>
            </Link>
            <Link href="/profile" className="flex flex-col items-center py-2 px-1 rounded-lg hover:bg-gray-100 text-gray-500">
              <svg className="h-5 w-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
              </svg>
              <span className="text-xs font-medium">More</span>
            </Link>
          </div>
        </div>

        {/* Spacer for mobile bottom nav */}
        <div className="lg:hidden h-20" />
      </>
    );
  } catch (error) {
    console.error('Error in EmployeeDashboard:', error);
    return (
      <>
        <PageHeader
          title="Error Loading Dashboard"
          subtitle="An error occurred while loading your dashboard"
        />
        <PageContent>
          <div className="bg-rose-50 rounded-2xl border border-rose-200 p-6">
            <p className="text-rose-600 font-medium">An error occurred while loading your dashboard. Please try again later.</p>
            <p className="text-sm text-slate-600 mt-2">{error instanceof Error ? error.message : 'Unknown error'}</p>
          </div>
        </PageContent>
      </>
    );
  }
}

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes:
 *   - Added JSDoc module documentation at top
 * Issues: None - comprehensive dashboard with proper error handling
 */
