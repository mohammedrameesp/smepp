import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { Button } from '@/components/ui/button';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus, FileText, Clock, CheckCircle, XCircle } from 'lucide-react';
import { SpendRequestListTable } from '@/features/spend-requests/components';
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { StatChip, StatChipGroup } from '@/components/ui/stat-chip';
import { DetailCard } from '@/components/ui/detail-card';

export default async function EmployeeSpendRequestsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // Fetch statistics for current user only
  const [
    totalRequests,
    pendingRequests,
    approvedRequests,
    rejectedRequests,
  ] = await Promise.all([
    prisma.spendRequest.count({ where: { requesterId: session.user.id } }),
    prisma.spendRequest.count({ where: { requesterId: session.user.id, status: 'PENDING' } }),
    prisma.spendRequest.count({ where: { requesterId: session.user.id, status: 'APPROVED' } }),
    prisma.spendRequest.count({ where: { requesterId: session.user.id, status: 'REJECTED' } }),
  ]);

  return (
    <>
      <PageHeader
        title="My Spend Requests"
        subtitle="Submit and track your spend requests"
        breadcrumbs={[
          { label: 'Dashboard', href: '/employee' },
          { label: 'Spend Requests' }
        ]}
        actions={
          <Link href="/employee/spend-requests/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Request
            </Button>
          </Link>
        }
      >
        <StatChipGroup>
          <StatChip
            value={totalRequests}
            label="total requests"
            color="slate"
            icon={<FileText className="h-4 w-4" />}
          />
          {pendingRequests > 0 && (
            <StatChip
              value={pendingRequests}
              label="pending"
              color="amber"
              icon={<Clock className="h-4 w-4" />}
            />
          )}
          {approvedRequests > 0 && (
            <StatChip
              value={approvedRequests}
              label="approved"
              color="emerald"
              icon={<CheckCircle className="h-4 w-4" />}
            />
          )}
          {rejectedRequests > 0 && (
            <StatChip
              value={rejectedRequests}
              label="rejected"
              color="rose"
              icon={<XCircle className="h-4 w-4" />}
            />
          )}
        </StatChipGroup>
      </PageHeader>

      <PageContent>
        <DetailCard icon={FileText} iconColor="indigo" title="My Requests" subtitle="All spend requests you have submitted">
          <SpendRequestListTable isAdmin={false} />
        </DetailCard>
      </PageContent>
    </>
  );
}
