import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus, Clock, FileText, Calendar } from 'lucide-react';
import { LeaveBalanceCard } from '@/features/leave/components';
import { getLeaveStatusVariant, getDateRangeText, formatLeaveDays, getAnnualLeaveDetails } from '@/features/leave/lib/leave-utils';
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { StatChip, StatChipGroup } from '@/components/ui/stat-chip';
import { DetailCard } from '@/components/ui/detail-card';

export default async function EmployeeLeavePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // session.user.id is the TeamMember ID when isTeamMember is true
  const memberId = session.user.id;
  const currentYear = new Date().getFullYear();
  const now = new Date();
  const sevenDaysFromNow = new Date(now);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  // Get team member's gender and date of joining for accrual calculation
  const teamMember = await prisma.teamMember.findUnique({
    where: { id: memberId },
    select: { gender: true, dateOfJoining: true },
  });
  const userGender = teamMember?.gender?.toUpperCase();
  const dateOfJoining = teamMember?.dateOfJoining;

  // Fetch data for the employee
  const [balances, recentRequests, upcomingLeaves] = await Promise.all([
    prisma.leaveBalance.findMany({
      where: {
        memberId,
        year: currentYear,
        // Only show balances where:
        // 1. Leave type is STANDARD or MEDICAL (auto-assigned)
        // 2. OR it's a PARENTAL/RELIGIOUS that was specifically assigned
        OR: [
          { leaveType: { category: { in: ['STANDARD', 'MEDICAL'] } } },
          // For PARENTAL/RELIGIOUS, they should only exist if admin assigned them
          // But also filter by gender restriction
          {
            leaveType: {
              category: { in: ['PARENTAL', 'RELIGIOUS'] },
              OR: [
                { genderRestriction: null },
                { genderRestriction: userGender || 'NONE' },
              ],
            },
          },
        ],
      },
      include: {
        leaveType: {
          select: {
            id: true,
            name: true,
            color: true,
            isPaid: true,
            category: true,
            genderRestriction: true,
            accrualBased: true,
          },
        },
      },
      orderBy: {
        leaveType: { name: 'asc' },
      },
    }),
    prisma.leaveRequest.findMany({
      where: { memberId },
      include: {
        leaveType: {
          select: { id: true, name: true, color: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.leaveRequest.findMany({
      where: {
        memberId,
        status: 'APPROVED',
        startDate: {
          gte: now,
          lte: sevenDaysFromNow,
        },
      },
      include: {
        leaveType: {
          select: { id: true, name: true, color: true },
        },
      },
      orderBy: { startDate: 'asc' },
    }),
  ]);

  // Calculate stats
  const totalAvailable = balances.reduce((sum, b) => {
    const available = Number(b.entitlement) + Number(b.carriedForward) + Number(b.adjustment) - Number(b.used) - Number(b.pending);
    return sum + available;
  }, 0);
  const pendingRequests = recentRequests.filter(r => r.status === 'PENDING').length;

  return (
    <>
      <PageHeader
        title="My Leave"
        subtitle="View your leave balance and manage requests"
        breadcrumbs={[
          { label: 'Dashboard', href: '/employee' },
          { label: 'My Leave' }
        ]}
        actions={
          <Link href="/employee/leave/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Request Leave
            </Button>
          </Link>
        }
      >
        <StatChipGroup>
          <StatChip
            value={totalAvailable.toFixed(1)}
            label="days available"
            color="emerald"
            icon={<Calendar className="h-4 w-4" />}
          />
          <StatChip
            value={pendingRequests}
            label={pendingRequests === 1 ? 'pending request' : 'pending requests'}
            color="amber"
            icon={<Clock className="h-4 w-4" />}
            hideWhenZero
          />
        </StatChipGroup>
      </PageHeader>

      <PageContent>
        {/* Leave Balances */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-slate-900">My Leave Balance ({currentYear})</h2>
          {balances.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
              <p className="text-slate-500">
                No leave balances found. Contact HR to set up your leave entitlements.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {balances.map((balance) => {
                // For accrual-based leave types, calculate accrued amount
                let accrualInfo: { accrued?: number; annualEntitlement?: number; monthsWorked?: number } = {};

                if (balance.leaveType.accrualBased && dateOfJoining) {
                  const annualLeaveDetails = getAnnualLeaveDetails(dateOfJoining, currentYear, now);
                  accrualInfo = {
                    accrued: annualLeaveDetails.accrued,
                    annualEntitlement: annualLeaveDetails.annualEntitlement,
                    monthsWorked: annualLeaveDetails.monthsWorked,
                  };
                }

                return (
                  <LeaveBalanceCard
                    key={balance.id}
                    balance={{
                      ...balance,
                      entitlement: Number(balance.entitlement),
                      used: Number(balance.used),
                      pending: Number(balance.pending),
                      carriedForward: Number(balance.carriedForward),
                      adjustment: Number(balance.adjustment),
                      ...accrualInfo,
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Recent Requests */}
          <DetailCard
            icon={FileText}
            iconColor="indigo"
            title="Recent Requests"
            subtitle="Your latest leave requests"
            actions={
              <Link href="/employee/leave/requests">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            }
          >
            {recentRequests.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No leave requests yet</p>
            ) : (
              <div className="space-y-3">
                {recentRequests.map((request) => (
                  <Link
                    key={request.id}
                    href={`/employee/leave/${request.id}`}
                    className="block p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: request.leaveType.color }}
                        />
                        <span className="font-medium text-slate-900">{request.leaveType.name}</span>
                      </div>
                      <Badge variant={getLeaveStatusVariant(request.status)}>
                        {request.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-slate-500">
                      {getDateRangeText(new Date(request.startDate), new Date(request.endDate))}
                      <span className="mx-2">|</span>
                      {formatLeaveDays(request.totalDays)}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </DetailCard>

          {/* Upcoming Leaves */}
          <DetailCard icon={Clock} iconColor="emerald" title="Upcoming Leaves" subtitle="Your approved leaves in the next 7 days">
            {upcomingLeaves.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No upcoming leaves</p>
            ) : (
              <div className="space-y-3">
                {upcomingLeaves.map((request) => (
                  <Link
                    key={request.id}
                    href={`/employee/leave/${request.id}`}
                    className="block p-3 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: request.leaveType.color }}
                      />
                      <span className="font-medium text-slate-900">{request.leaveType.name}</span>
                    </div>
                    <div className="text-sm text-slate-600">
                      {getDateRangeText(new Date(request.startDate), new Date(request.endDate))}
                      <span className="mx-2">|</span>
                      {formatLeaveDays(request.totalDays)}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </DetailCard>
        </div>
      </PageContent>
    </>
  );
}
