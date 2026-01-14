import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { redirect } from 'next/navigation';

import { Calendar, Plus, Users, FileText } from 'lucide-react';
import { PageHeader, PageHeaderButton, PageContent } from '@/components/ui/page-header';
import { StatChip, StatChipGroup } from '@/components/ui/stat-chip';
import { LeaveBalancesClient } from './client';

export default async function AdminLeaveBalancesPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  if (process.env.NODE_ENV !== 'development' && !session.user.isAdmin) {
    redirect('/forbidden');
  }

  if (!session.user.organizationId) {
    redirect('/login');
  }

  const tenantId = session.user.organizationId;
  const today = new Date();

  const [pendingCount, approvedCount, onLeaveToday, employeeCount] = await Promise.all([
    prisma.leaveRequest.count({ where: { tenantId, status: 'PENDING' } }),
    prisma.leaveRequest.count({ where: { tenantId, status: 'APPROVED' } }),
    prisma.leaveRequest.count({
      where: {
        tenantId,
        status: 'APPROVED',
        startDate: { lte: today },
        endDate: { gte: today },
      },
    }),
    prisma.leaveBalance.groupBy({
      by: ['memberId'],
      where: { tenantId, year: today.getFullYear() },
    }).then(groups => groups.length),
  ]);

  return (
    <>
      <PageHeader
        title="Leave Balances"
        subtitle="View and manage employee leave balances"
        actions={
          <>
            <PageHeaderButton href="/admin/leave/requests/new" variant="primary">
              <Plus className="h-4 w-4" />
              Create Request
            </PageHeaderButton>
            <PageHeaderButton href="/admin/leave/requests" variant="secondary">
              <FileText className="h-4 w-4" />
              All Requests
            </PageHeaderButton>
            <PageHeaderButton href="/admin/leave/calendar" variant="secondary">
              <Calendar className="h-4 w-4" />
              Calendar View
            </PageHeaderButton>
          </>
        }
      >
        <StatChipGroup>
          <StatChip value={pendingCount} label="pending" color="amber" href="/admin/leave/requests?status=PENDING" hideWhenZero />
          <StatChip value={approvedCount} label="approved" color="emerald" />
          <StatChip value={onLeaveToday} label="on leave today" color="blue" hideWhenZero />
          <StatChip value={employeeCount} label="employees" color="slate" />
        </StatChipGroup>
      </PageHeader>

      <PageContent>
        <LeaveBalancesClient />
      </PageContent>
    </>
  );
}
