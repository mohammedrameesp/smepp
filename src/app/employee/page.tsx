import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  Palmtree,
  Laptop,
  Clock,
  AlertTriangle,
  Bell,
} from 'lucide-react';
import { getMemberSubscriptionHistory } from '@/lib/subscription-lifecycle';
import { getUserAssetHistory } from '@/lib/asset-lifecycle';
import { getNextRenewalDate, getDaysUntilRenewal } from '@/lib/utils/renewal-date';
import { getAnnualLeaveDetails } from '@/lib/leave-utils';
import { format } from 'date-fns';
import {
  StatCard,
  AlertBanner,
  CelebrationsCard,
  RequestsCard,
  LeaveBalanceWidget,
  HoldingsCard,
  UpcomingCard,
  QuickActions,
} from '@/components/employee/dashboard';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default async function EmployeeDashboard() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  if (session.user.role !== 'EMPLOYEE') {
    redirect('/');
  }

  try {
    // Get organization ID from session (session.user.id is now the TeamMember ID)
    const organizationId = session.user.organizationId;

    // Get all data in parallel
    const [
      subscriptionHistory,
      assetHistory,
      purchaseRequests,
      memberProfile,
      leaveRequests,
      leaveBalances,
      assetRequests,
      celebrations,
    ] = await Promise.all([
      getMemberSubscriptionHistory(session.user.id),
      getUserAssetHistory(session.user.id),
      prisma.purchaseRequest.findMany({
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
    const activeAssets = assetHistory.filter((a: any) => a.isCurrentlyAssigned);
    const activeSubscriptions = subscriptionHistory.filter((s: any) => s.status === 'ACTIVE');
    const pendingPurchaseRequests = purchaseRequests.filter((pr: any) => pr.status === 'PENDING');
    const pendingLeaveRequests = leaveRequests.filter((lr: any) => lr.status === 'PENDING');
    const pendingAssetRequests = assetRequests.filter((ar: any) => ar.status === 'PENDING');
    const approvedLeaveRequests = leaveRequests.filter((lr) => lr.status === 'APPROVED');

    const totalPendingRequests = pendingPurchaseRequests.length + pendingLeaveRequests.length + pendingAssetRequests.length;

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

    const processedCelebrations = celebrations
      .map((member: any) => {
        const results: any[] = [];

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
      .filter((c: any) => c.name !== session.user.name) // Exclude self
      .sort((a: any, b: any) => a.date.getTime() - b.date.getTime());

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
      .map((sub: any) => {
        if (!sub.currentPeriod?.renewalDate) return null;
        const nextRenewal = getNextRenewalDate(sub.currentPeriod.renewalDate, sub.billingCycle);
        const daysUntil = getDaysUntilRenewal(nextRenewal);
        if (daysUntil === null || daysUntil > 30) return null;
        return { ...sub, nextRenewalDate: nextRenewal, daysUntilRenewal: daysUntil };
      })
      .filter(Boolean);

    // Transform data for components
    const unifiedRequests = [
      ...purchaseRequests.slice(0, 3).map((pr: any) => ({
        id: pr.id,
        type: 'purchase' as const,
        title: pr.title,
        referenceNumber: pr.referenceNumber,
        status: pr.status,
        subtitle: `${pr._count.items} item(s)`,
        createdAt: pr.createdAt,
      })),
      ...leaveRequests.slice(0, 3).map((lr: any) => ({
        id: lr.id,
        type: 'leave' as const,
        title: lr.leaveType.name,
        referenceNumber: lr.requestNumber || `LR-${lr.id.slice(0, 6)}`,
        status: lr.status,
        subtitle: `${Number(lr.totalDays)} day(s)`,
        createdAt: lr.createdAt,
        color: lr.leaveType.color,
      })),
      ...assetRequests.slice(0, 2).map((ar: any) => ({
        id: ar.id,
        type: 'asset' as const,
        title: ar.asset?.name || 'Asset Request',
        referenceNumber: ar.requestNumber || `AR-${ar.id.slice(0, 6)}`,
        status: ar.status,
        subtitle: ar.asset?.assetCode || '',
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

    const assetsData = activeAssets.slice(0, 3).map((a: any) => ({
      id: a.id,
      name: a.name,
      code: a.assetCode,
      type: a.assetType?.name,
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
      ...upcomingRenewals.slice(0, 2).map((sub: any) => ({
        id: sub.id,
        type: 'renewal' as const,
        title: sub.serviceName,
        date: sub.nextRenewalDate,
        subtitle: sub.costPerPeriod ? `QAR ${sub.costPerPeriod}/${sub.billingCycle?.toLowerCase()}` : undefined,
      })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return (
      <>
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-50 to-blue-50 border-b">
          <div className="max-w-6xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-gray-900">
                  {getGreeting()}, {session.user.name?.split(' ')[0]}!
                </h1>
                <p className="text-sm text-gray-500">
                  {format(new Date(), 'EEEE, MMMM d, yyyy')}
                </p>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard
                icon={Palmtree}
                value={totalAvailableLeaveDays.toFixed(1)}
                label="Leave Days"
                color="blue"
              />
              <StatCard
                icon={Laptop}
                value={activeAssets.length}
                label="Assets"
                color="emerald"
              />
              <StatCard
                icon={Clock}
                value={totalPendingRequests}
                label="Pending"
                color="violet"
              />
              <StatCard
                icon={AlertTriangle}
                value={documentAlerts.length}
                label={documentAlerts.length === 1 ? 'Alert' : 'Alerts'}
                color="amber"
              />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-6xl mx-auto px-4 py-6">
          {/* Alert Banner */}
          <AlertBanner alerts={documentAlerts} className="mb-4" />

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
        </main>

        {/* Mobile Bottom Navigation */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50">
          <div className="grid grid-cols-4 gap-1 p-2">
            <Link href="/employee/leave/new" className="flex flex-col items-center py-2 px-1 rounded-lg hover:bg-blue-50 text-blue-600">
              <Palmtree className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">Leave</span>
            </Link>
            <Link href="/employee/purchase-requests/new" className="flex flex-col items-center py-2 px-1 rounded-lg hover:bg-violet-50 text-gray-500 hover:text-violet-600">
              <svg className="h-5 w-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="text-xs font-medium">Purchase</span>
            </Link>
            <Link href="/employee/my-assets" className="flex flex-col items-center py-2 px-1 rounded-lg hover:bg-emerald-50 text-gray-500 hover:text-emerald-600">
              <Laptop className="h-5 w-5 mb-1" />
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
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">Error Loading Dashboard</h2>
            </CardHeader>
            <CardContent>
              <p className="text-red-600">An error occurred while loading your dashboard. Please try again later.</p>
              <p className="text-sm text-gray-600 mt-2">{error instanceof Error ? error.message : 'Unknown error'}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
}
