import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { redirect } from 'next/navigation';

import { Users, AlertTriangle, FileText } from 'lucide-react';
import { PageHeader, PageHeaderButton, PageContent } from '@/components/ui/page-header';
import { StatChip, StatChipGroup } from '@/components/ui/stat-chip';
import { ChangeRequestsClient } from './client';

export default async function ChangeRequestsPage() {
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
  const thirtyDaysFromNow = new Date(today);
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const [pendingCount, approvedCount, rejectedCount, expiringDocumentsCount] = await Promise.all([
    prisma.profileChangeRequest.count({ where: { tenantId, status: 'PENDING' } }),
    prisma.profileChangeRequest.count({ where: { tenantId, status: 'APPROVED' } }),
    prisma.profileChangeRequest.count({ where: { tenantId, status: 'REJECTED' } }),
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
  ]);

  return (
    <>
      <PageHeader
        title="Change Requests"
        subtitle="Review and manage employee profile change requests"
        actions={
          <>
            <PageHeaderButton href="/admin/employees" variant="secondary">
              <Users className="h-4 w-4" />
              All Employees
            </PageHeaderButton>
            <PageHeaderButton href="/admin/employees/document-expiry" variant="secondary">
              <FileText className="h-4 w-4" />
              Document Expiry
              {expiringDocumentsCount > 0 && (
                <span className="bg-rose-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {expiringDocumentsCount}
                </span>
              )}
            </PageHeaderButton>
          </>
        }
      >
        <StatChipGroup>
          <StatChip value={pendingCount} label="pending" color="amber" hideWhenZero />
          <StatChip value={approvedCount} label="approved" color="emerald" hideWhenZero />
          <StatChip value={rejectedCount} label="rejected" color="rose" hideWhenZero />
        </StatChipGroup>
      </PageHeader>

      <PageContent>
        <ChangeRequestsClient />
      </PageContent>
    </>
  );
}
