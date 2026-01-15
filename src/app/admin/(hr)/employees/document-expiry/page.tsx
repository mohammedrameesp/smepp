import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { redirect } from 'next/navigation';

import { Users, ClipboardList } from 'lucide-react';
import { PageHeader, PageHeaderButton, PageContent } from '@/components/ui/page-header';
import { StatChip, StatChipGroup } from '@/components/ui/stat-chip';
import { DocumentExpiryClient } from './client';

export default async function DocumentExpiryPage() {
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

  // Count expired and expiring documents
  const [expiredCount, expiringCount, pendingChangeRequests] = await Promise.all([
    // Expired documents (any document with expiry date before today)
    prisma.teamMember.count({
      where: {
        tenantId,
        isEmployee: true,
        isDeleted: false,
        OR: [
          { qidExpiry: { lt: today } },
          { passportExpiry: { lt: today } },
          { healthCardExpiry: { lt: today } },
          { contractExpiry: { lt: today } },
          { licenseExpiry: { lt: today } },
        ],
      },
    }),
    // Expiring soon (within 30 days)
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
    prisma.profileChangeRequest.count({
      where: { tenantId, status: 'PENDING' },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Document Expiry"
        subtitle="Track and manage expiring employee documents"
        actions={
          <>
            <PageHeaderButton href="/admin/employees" variant="secondary">
              <Users className="h-4 w-4" />
              All Employees
            </PageHeaderButton>
            <PageHeaderButton href="/admin/employees/change-requests" variant="secondary">
              <ClipboardList className="h-4 w-4" />
              Change Requests
              {pendingChangeRequests > 0 && (
                <span className="bg-rose-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {pendingChangeRequests}
                </span>
              )}
            </PageHeaderButton>
          </>
        }
      >
        <StatChipGroup>
          <StatChip value={expiredCount} label="expired" color="rose" hideWhenZero />
          <StatChip value={expiringCount} label="expiring soon" color="amber" hideWhenZero />
          <StatChip value={expiredCount + expiringCount} label="total alerts" color="slate" />
        </StatChipGroup>
      </PageHeader>

      <PageContent>
        <DocumentExpiryClient />
      </PageContent>
    </>
  );
}
