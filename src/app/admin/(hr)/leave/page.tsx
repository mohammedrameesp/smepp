import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Calendar, FileText, Users, Settings } from 'lucide-react';
import { getLeaveStatusVariant, getDateRangeText, formatLeaveDays } from '@/lib/leave-utils';
import { PageHeader, PageHeaderButton, PageContent } from '@/components/ui/page-header';

export default async function AdminLeavePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  if (process.env.NODE_ENV !== 'development' && session.user.teamMemberRole !== 'ADMIN') {
    redirect('/forbidden');
  }

  // Require organization context for tenant isolation
  if (!session.user.organizationId) {
    redirect('/forbidden');
  }

  const tenantId = session.user.organizationId;
  const currentYear = new Date().getFullYear();
  const now = new Date();
  const sevenDaysFromNow = new Date(now);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  // Fetch statistics (filtered by tenant)
  const [
    pendingCount,
    approvedThisYear,
    rejectedThisYear,
    activeLeaveTypes,
    pendingRequests,
    upcomingLeaves,
  ] = await Promise.all([
    prisma.leaveRequest.count({
      where: { tenantId, status: 'PENDING' },
    }),
    prisma.leaveRequest.count({
      where: {
        tenantId,
        status: 'APPROVED',
        startDate: {
          gte: new Date(`${currentYear}-01-01`),
          lt: new Date(`${currentYear + 1}-01-01`),
        },
      },
    }),
    prisma.leaveRequest.count({
      where: {
        tenantId,
        status: 'REJECTED',
        createdAt: {
          gte: new Date(`${currentYear}-01-01`),
          lt: new Date(`${currentYear + 1}-01-01`),
        },
      },
    }),
    prisma.leaveType.count({
      where: { tenantId, isActive: true },
    }),
    prisma.leaveRequest.findMany({
      where: { tenantId, status: 'PENDING' },
      include: {
        member: {
          select: { id: true, name: true, email: true },
        },
        leaveType: {
          select: { id: true, name: true, color: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.leaveRequest.findMany({
      where: {
        tenantId,
        status: 'APPROVED',
        startDate: {
          gte: now,
          lte: sevenDaysFromNow,
        },
      },
      include: {
        member: {
          select: { id: true, name: true, email: true },
        },
        leaveType: {
          select: { id: true, name: true, color: true },
        },
      },
      orderBy: { startDate: 'asc' },
      take: 5,
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Leave Management"
        subtitle="Manage employee leave requests, balances, and types"
      >
        {/* Summary Chips */}
        <div className="flex flex-wrap items-center gap-3 mt-4">
          {pendingCount > 0 && (
            <Link
              href="/admin/leave/requests?status=PENDING"
              className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 rounded-lg transition-colors"
            >
              <span className="text-amber-400 text-sm font-medium">{pendingCount} pending approval</span>
            </Link>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 rounded-lg">
            <span className="text-emerald-400 text-sm font-medium">{approvedThisYear} approved this year</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-500/20 rounded-lg">
            <span className="text-slate-300 text-sm font-medium">{activeLeaveTypes} leave types</span>
          </div>
        </div>
      </PageHeader>

      <PageContent>
        {/* Quick Links */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Link href="/admin/leave/requests">
            <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2">
              <FileText className="h-6 w-6" />
              <span>All Requests</span>
            </Button>
          </Link>
          <Link href="/admin/leave/balances">
            <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2">
              <Users className="h-6 w-6" />
              <span>Leave Balances</span>
            </Button>
          </Link>
          <Link href="/admin/leave/types">
            <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2">
              <Settings className="h-6 w-6" />
              <span>Leave Types</span>
            </Button>
          </Link>
          <Link href="/admin/leave/calendar">
            <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2">
              <Calendar className="h-6 w-6" />
              <span>Team Calendar</span>
            </Button>
          </Link>
        </div>

        {/* Two Column Layout */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Pending Requests */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Pending Requests</CardTitle>
                  <CardDescription>Requests awaiting your approval</CardDescription>
                </div>
                <Link href="/admin/leave/requests?status=PENDING">
                  <Button variant="ghost" size="sm">View All</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {pendingRequests.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No pending requests</p>
              ) : (
                <div className="space-y-3">
                  {pendingRequests.map((request) => (
                    <Link
                      key={request.id}
                      href={`/admin/leave/requests/${request.id}`}
                      className="block p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div>
                          <span className="font-medium">{request.member?.name}</span>
                          <span className="text-gray-500 text-sm ml-2">{request.requestNumber}</span>
                        </div>
                        <Badge variant={getLeaveStatusVariant(request.status)}>
                          {request.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: request.leaveType.color }}
                        />
                        <span>{request.leaveType.name}</span>
                        <span className="text-gray-400">|</span>
                        <span>{getDateRangeText(new Date(request.startDate), new Date(request.endDate))}</span>
                        <span className="text-gray-400">|</span>
                        <span>{formatLeaveDays(request.totalDays)}</span>
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
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Upcoming Leaves</CardTitle>
                  <CardDescription>Approved leaves in the next 7 days</CardDescription>
                </div>
                <Link href="/admin/leave/calendar">
                  <Button variant="ghost" size="sm">View Calendar</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {upcomingLeaves.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No upcoming leaves</p>
              ) : (
                <div className="space-y-3">
                  {upcomingLeaves.map((request) => (
                    <div
                      key={request.id}
                      className="p-3 rounded-lg border"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium">{request.member?.name}</span>
                        <span className="text-sm text-gray-500">
                          {formatLeaveDays(request.totalDays)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: request.leaveType.color }}
                        />
                        <span>{request.leaveType.name}</span>
                        <span className="text-gray-400">|</span>
                        <span>{getDateRangeText(new Date(request.startDate), new Date(request.endDate))}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </PageContent>
    </>
  );
}
