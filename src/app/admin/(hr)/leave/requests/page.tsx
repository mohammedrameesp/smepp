import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import { LeaveRequestsTable } from '@/components/leave/leave-requests-table';
import { Calendar, Plus } from 'lucide-react';
import { PageHeader, PageHeaderButton, PageContent } from '@/components/ui/page-header';

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
    <>
      <PageHeader
        title="Leave Requests"
        subtitle="View and manage employee leave requests"
        actions={
          <>
            <PageHeaderButton href="/admin/leave/requests/new" variant="primary">
              <Plus className="h-4 w-4" />
              Create Request
            </PageHeaderButton>
            <PageHeaderButton href="/admin/leave/calendar" variant="secondary">
              <Calendar className="h-4 w-4" />
              Calendar View
            </PageHeaderButton>
          </>
        }
      >
        {/* Stats Summary */}
        <div className="flex flex-wrap items-center gap-4 mt-4">
          {pendingCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 rounded-lg">
              <span className="text-amber-400 text-sm font-medium">{pendingCount} pending</span>
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 rounded-lg">
            <span className="text-emerald-400 text-sm font-medium">{approvedCount} approved</span>
          </div>
          {rejectedCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/20 rounded-lg">
              <span className="text-rose-400 text-sm font-medium">{rejectedCount} rejected</span>
            </div>
          )}
          {onLeaveToday > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 rounded-lg">
              <span className="text-blue-400 text-sm font-medium">{onLeaveToday} on leave today</span>
            </div>
          )}
        </div>
      </PageHeader>

      <PageContent>
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
      </PageContent>
    </>
  );
}
