import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus, Clock, FileText } from 'lucide-react';
import { LeaveBalanceCard } from '@/components/leave';
import { getLeaveStatusVariant, getDateRangeText, formatLeaveDays, getAnnualLeaveDetails } from '@/lib/leave-utils';

export default async function EmployeeLeavePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  const userId = session.user.id;
  const currentYear = new Date().getFullYear();
  const now = new Date();
  const sevenDaysFromNow = new Date(now);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  // Get user's HR profile for gender check and date of joining (for accrual calculation)
  const hrProfile = await prisma.hRProfile.findUnique({
    where: { userId },
    select: { gender: true, dateOfJoining: true },
  });
  const userGender = hrProfile?.gender?.toUpperCase();
  const dateOfJoining = hrProfile?.dateOfJoining;

  // Fetch data for the employee
  const [balances, recentRequests, upcomingLeaves] = await Promise.all([
    prisma.leaveBalance.findMany({
      where: {
        userId,
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
      where: { userId },
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
        userId,
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

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">My Leave</h1>
              <p className="text-gray-600">
                View your leave balance and manage requests
              </p>
            </div>
            <Link href="/employee/leave/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Request Leave
              </Button>
            </Link>
          </div>
        </div>

        {/* Leave Balances */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">My Leave Balance ({currentYear})</h2>
          {balances.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                No leave balances found. Contact HR to set up your leave entitlements.
              </CardContent>
            </Card>
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
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Recent Requests
                  </CardTitle>
                  <CardDescription>Your latest leave requests</CardDescription>
                </div>
                <Link href="/employee/leave/requests">
                  <Button variant="ghost" size="sm">View All</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentRequests.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No leave requests yet</p>
              ) : (
                <div className="space-y-3">
                  {recentRequests.map((request) => (
                    <Link
                      key={request.id}
                      href={`/employee/leave/${request.id}`}
                      className="block p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: request.leaveType.color }}
                          />
                          <span className="font-medium">{request.leaveType.name}</span>
                        </div>
                        <Badge variant={getLeaveStatusVariant(request.status)}>
                          {request.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-500">
                        {getDateRangeText(new Date(request.startDate), new Date(request.endDate))}
                        <span className="mx-2">|</span>
                        {formatLeaveDays(request.totalDays)}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Leaves */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Upcoming Leaves
              </CardTitle>
              <CardDescription>Your approved leaves in the next 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingLeaves.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No upcoming leaves</p>
              ) : (
                <div className="space-y-3">
                  {upcomingLeaves.map((request) => (
                    <div
                      key={request.id}
                      className="p-3 rounded-lg border bg-green-50 border-green-200"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: request.leaveType.color }}
                        />
                        <span className="font-medium">{request.leaveType.name}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {getDateRangeText(new Date(request.startDate), new Date(request.endDate))}
                        <span className="mx-2">|</span>
                        {formatLeaveDays(request.totalDays)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
