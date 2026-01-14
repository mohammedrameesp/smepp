import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/core/prisma';
import { ClipboardList, AlertTriangle, Calendar, FileText } from 'lucide-react';
import { PageHeader, PageHeaderButton, PageContent } from '@/components/ui/page-header';
import { StatChip, StatChipGroup } from '@/components/ui/stat-chip';
import { TeamClient } from './team-client';

export default async function AdminTeamPage() {
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
  const thirtyDaysFromNow = new Date(today);
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const [
    totalEmployees,
    totalNonEmployees,
    pendingChangeRequests,
    expiringDocumentsCount,
    onLeaveToday,
  ] = await Promise.all([
    // Count employees
    prisma.teamMember.count({
      where: {
        tenantId,
        isEmployee: true,
        isDeleted: false,
      },
    }),
    // Count non-employees
    prisma.teamMember.count({
      where: {
        tenantId,
        isEmployee: false,
        isDeleted: false,
      },
    }),
    prisma.profileChangeRequest.count({
      where: { tenantId, status: 'PENDING' },
    }),
    // Count expiring documents
    prisma.teamMember.count({
      where: {
        tenantId,
        isEmployee: true,
        isDeleted: false,
        OR: [
          { qidExpiry: { gte: today, lte: thirtyDaysFromNow } },
          { passportExpiry: { gte: today, lte: thirtyDaysFromNow } },
          { healthCardExpiry: { gte: today, lte: thirtyDaysFromNow } },
          { contractExpiry: { gte: today, lte: thirtyDaysFromNow } },
          { licenseExpiry: { gte: today, lte: thirtyDaysFromNow } },
        ],
      },
    }),
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
        title="Team"
        subtitle="Manage team members, employees, and invitations"
        actions={
          <>
            <PageHeaderButton href="/admin/employees/change-requests" variant="secondary">
              <ClipboardList className="h-4 w-4" />
              Change Requests
              {pendingChangeRequests > 0 && (
                <span className="bg-rose-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {pendingChangeRequests}
                </span>
              )}
            </PageHeaderButton>
            <PageHeaderButton href="/admin/employees/document-expiry" variant="secondary">
              <FileText className="h-4 w-4" />
              Document Expiry
              {expiringDocumentsCount > 0 && (
                <span className="bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {expiringDocumentsCount}
                </span>
              )}
            </PageHeaderButton>
          </>
        }
      >
        <StatChipGroup>
          <StatChip value={totalEmployees + totalNonEmployees} label="members" color="blue" />
          <StatChip
            value={onLeaveToday}
            label="on leave today"
            color="amber"
            icon={<Calendar className="h-3.5 w-3.5" />}
            hideWhenZero
          />
          <StatChip
            value={expiringDocumentsCount}
            label="expiring documents"
            color="rose"
            icon={<AlertTriangle className="h-3.5 w-3.5" />}
            href="/admin/employees/document-expiry"
            hideWhenZero
          />
          <StatChip
            value={pendingChangeRequests}
            label="change requests"
            color="purple"
            href="/admin/employees/change-requests"
            hideWhenZero
          />
        </StatChipGroup>
      </PageHeader>

      <PageContent>
        <TeamClient
          initialStats={{
            totalEmployees,
            totalNonEmployees,
            onLeaveToday,
            expiringDocuments: expiringDocumentsCount,
            pendingChangeRequests,
          }}
        />
      </PageContent>
    </>
  );
}
