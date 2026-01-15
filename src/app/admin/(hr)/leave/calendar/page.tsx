import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { redirect } from 'next/navigation';

import { Plus, Users, FileText } from 'lucide-react';
import { PageHeader, PageHeaderButton, PageContent } from '@/components/ui/page-header';
import { StatChip, StatChipGroup } from '@/components/ui/stat-chip';
import { LeaveCalendarClient } from './client';

export default async function AdminLeaveCalendarPage() {
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

  const [pendingCount, approvedCount, onLeaveToday] = await Promise.all([
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
  ]);

  return (
    <>
      <PageHeader
        title="Team Calendar"
        subtitle="View all team leave schedules at a glance"
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
            <PageHeaderButton href="/admin/leave/balances" variant="secondary">
              <Users className="h-4 w-4" />
              Leave Balances
            </PageHeaderButton>
          </>
        }
      >
        <StatChipGroup>
          <StatChip value={pendingCount} label="pending" color="amber" href="/admin/leave/requests?status=PENDING" hideWhenZero />
          <StatChip value={approvedCount} label="approved" color="emerald" />
          <StatChip value={onLeaveToday} label="on leave today" color="blue" hideWhenZero />
        </StatChipGroup>
      </PageHeader>

      <PageContent>
        <LeaveCalendarClient />
      </PageContent>
    </>
  );
}
