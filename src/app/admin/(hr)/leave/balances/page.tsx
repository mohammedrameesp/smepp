import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { redirect } from 'next/navigation';

import { Calendar, Plus, Users, FileText } from 'lucide-react';
import { PageHeader, PageHeaderButton, PageContent } from '@/components/ui/page-header';
import { StatChip, StatChipGroup } from '@/components/ui/stat-chip';
import { LeaveBalancesClient } from './client';
import { ICON_SIZES } from '@/lib/constants';

export default async function AdminLeaveBalancesPage() {
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
        subtitle="View and manage employee leave balances and exceptions"
        actions={
          <>
            <PageHeaderButton href="/admin/leave/requests/new" variant="primary">
              <Plus className={ICON_SIZES.sm} />
              Create Request
            </PageHeaderButton>
            <PageHeaderButton href="/admin/leave/requests" variant="secondary">
              <FileText className={ICON_SIZES.sm} />
              All Requests
            </PageHeaderButton>
            <PageHeaderButton href="/admin/leave/calendar" variant="secondary">
              <Calendar className={ICON_SIZES.sm} />
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
