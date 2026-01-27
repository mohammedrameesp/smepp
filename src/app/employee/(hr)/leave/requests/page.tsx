import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { Button } from '@/components/ui/button';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus, FileText } from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';
import { LeaveRequestsTable } from '@/features/leave/components';
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { DetailCard } from '@/components/ui/detail-card';

export default async function EmployeeLeaveRequestsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return (
    <>
      <PageHeader
        title="My Leave Requests"
        subtitle="View and manage all your leave requests"
        breadcrumbs={[
          { label: 'Dashboard', href: '/employee' },
          { label: 'My Leave', href: '/employee/leave' },
          { label: 'All Requests' }
        ]}
        actions={
          <Link href="/employee/leave/new">
            <Button>
              <Plus className={`${ICON_SIZES.sm} mr-2`} />
              New Request
            </Button>
          </Link>
        }
      />

      <PageContent>
        <DetailCard icon={FileText} iconColor="indigo" title="All Requests" subtitle="Filter and search through your leave requests">
          <LeaveRequestsTable
            showUser={false}
            memberId={session.user.id}
            basePath="/employee/leave"
          />
        </DetailCard>
      </PageContent>
    </>
  );
}
