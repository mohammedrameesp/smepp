import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { redirect } from 'next/navigation';

import { LeaveRequestsTableClient } from '@/features/leave/components';
import { Calendar, Plus, Users } from 'lucide-react';
import { PageHeader, PageHeaderButton, PageContent } from '@/components/ui/page-header';
import { StatChip, StatChipGroup } from '@/components/ui/stat-chip';

export default async function AdminLeaveRequestsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // Allow access for admins OR users with HR access
  const hasAccess = session.user.isAdmin || session.user.hasHRAccess;
  if (process.env.NODE_ENV !== 'development' && !hasAccess) {
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
            <PageHeaderButton href="/admin/leave/balances" variant="secondary">
              <Users className="h-4 w-4" />
              Leave Balances
            </PageHeaderButton>
            <PageHeaderButton href="/admin/leave/calendar" variant="secondary">
              <Calendar className="h-4 w-4" />
              Calendar View
            </PageHeaderButton>
          </>
        }
      >
        <StatChipGroup>
          <StatChip value={pendingCount} label="pending" color="amber" hideWhenZero />
          <StatChip value={approvedCount} label="approved" color="emerald" />
          <StatChip value={rejectedCount} label="rejected" color="rose" hideWhenZero />
          <StatChip value={onLeaveToday} label="on leave today" color="blue" hideWhenZero />
        </StatChipGroup>
      </PageHeader>

      <PageContent>
        {/* Leave Requests Table */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-4 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">All Leave Requests</h2>
            <p className="text-sm text-slate-500">Filter and search through leave requests</p>
          </div>
          <div className="p-4">
            <LeaveRequestsTableClient showUser={true} />
          </div>
        </div>
      </PageContent>
    </>
  );
}
