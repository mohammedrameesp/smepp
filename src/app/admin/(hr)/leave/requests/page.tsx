import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import { LeaveRequestsTable } from '@/components/leave/leave-requests-table';
import { Calendar, Clock, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { StatsCard, StatsCardGrid } from '@/components/ui/stats-card';

export default async function AdminLeaveRequestsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  if (process.env.NODE_ENV !== 'development' && session.user.role !== Role.ADMIN) {
    redirect('/forbidden');
  }

  if (!session.user.organizationId) {
    redirect('/login');
  }

  const tenantId = session.user.organizationId;
  const today = new Date();

  const [pendingCount, approvedCount, rejectedCount, onLeaveToday] = await Promise.all([
    prisma.leaveRequest.count({ where: { tenantId, status: 'PENDING' } }),
    prisma.leaveRequest.count({ where: { tenantId, status: 'APPROVED' } }),
    prisma.leaveRequest.count({ where: { tenantId, status: 'REJECTED' } }),
    prisma.leaveRequest.count({
      where: {
        tenantId,
        status: 'APPROVED',
        startDate: { lte: today },
        endDate: { gte: today },
      },
    }),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leave Requests</h1>
          <p className="text-slate-500 text-sm">View and manage employee leave requests</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/leave/calendar"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Calendar className="h-4 w-4" />
            Calendar View
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCardGrid columns={4} className="mb-6">
        <StatsCard
          title="Pending"
          subtitle="Awaiting approval"
          value={pendingCount}
          icon={Clock}
          color="amber"
        />
        <StatsCard
          title="Approved"
          subtitle="This year"
          value={approvedCount}
          icon={CheckCircle}
          color="emerald"
        />
        <StatsCard
          title="Rejected"
          subtitle="This year"
          value={rejectedCount}
          icon={XCircle}
          color="rose"
        />
        <StatsCard
          title="On Leave Today"
          subtitle="Currently away"
          value={onLeaveToday}
          icon={Calendar}
          color="blue"
        />
      </StatsCardGrid>

      {/* Leave Requests Table */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-4 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">All Leave Requests</h2>
          <p className="text-sm text-slate-500">Filter and search through leave requests</p>
        </div>
        <div className="p-4">
          <LeaveRequestsTable showUser={true} />
        </div>
      </div>
    </div>
  );
}
