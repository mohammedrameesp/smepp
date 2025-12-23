import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import Link from 'next/link';
import { Clock, CheckCircle, XCircle, Calendar, FileText, Users, Settings } from 'lucide-react';
import { getLeaveStatusVariant, getDateRangeText, formatLeaveDays } from '@/lib/leave-utils';

export default async function AdminLeavePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  if (process.env.NODE_ENV !== 'development' && session.user.role !== Role.ADMIN) {
    redirect('/forbidden');
  }

  const currentYear = new Date().getFullYear();
  const now = new Date();
  const sevenDaysFromNow = new Date(now);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  // Fetch statistics
  const [
    pendingCount,
    approvedThisYear,
    rejectedThisYear,
    activeLeaveTypes,
    pendingRequests,
    upcomingLeaves,
  ] = await Promise.all([
    prisma.leaveRequest.count({
      where: { status: 'PENDING' },
    }),
    prisma.leaveRequest.count({
      where: {
        status: 'APPROVED',
        startDate: {
          gte: new Date(`${currentYear}-01-01`),
          lt: new Date(`${currentYear + 1}-01-01`),
        },
      },
    }),
    prisma.leaveRequest.count({
      where: {
        status: 'REJECTED',
        createdAt: {
          gte: new Date(`${currentYear}-01-01`),
          lt: new Date(`${currentYear + 1}-01-01`),
        },
      },
    }),
    prisma.leaveType.count({
      where: { isActive: true },
    }),
    prisma.leaveRequest.findMany({
      where: { status: 'PENDING' },
      include: {
        user: {
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
        status: 'APPROVED',
        startDate: {
          gte: now,
          lte: sevenDaysFromNow,
        },
      },
      include: {
        user: {
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
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Leave Management</h1>
              <p className="text-gray-600">
                Manage employee leave requests, balances, and types
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-medium text-gray-600 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Pending Requests
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3 px-4">
                <div className="text-2xl font-bold text-amber-600">{pendingCount}</div>
                <p className="text-xs text-gray-500">awaiting approval</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-medium text-gray-600 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Approved This Year
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3 px-4">
                <div className="text-2xl font-bold text-green-600">{approvedThisYear}</div>
                <p className="text-xs text-gray-500">leave requests</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-medium text-gray-600 flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  Rejected This Year
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3 px-4">
                <div className="text-2xl font-bold text-red-600">{rejectedThisYear}</div>
                <p className="text-xs text-gray-500">leave requests</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-medium text-gray-600 flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Active Leave Types
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3 px-4">
                <div className="text-2xl font-bold text-blue-600">{activeLeaveTypes}</div>
                <p className="text-xs text-gray-500">configured</p>
              </CardContent>
            </Card>
          </div>

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
                          <span className="font-medium">{request.user.name}</span>
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
                        <span className="font-medium">{request.user.name}</span>
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
      </div>
    </div>
  );
}
