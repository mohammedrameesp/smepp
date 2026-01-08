import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { Button } from '@/components/ui/button';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus, FileText } from 'lucide-react';
import { LeaveRequestsTable } from '@/features/leave/components';
import { PageHeader, PageContent } from '@/components/ui/page-header';

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
              <Plus className="h-4 w-4 mr-2" />
              New Request
            </Button>
          </Link>
        }
      />

      <PageContent>
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <FileText className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">All Requests</h2>
              <p className="text-sm text-slate-500">Filter and search through your leave requests</p>
            </div>
          </div>
          <div className="p-5">
            <LeaveRequestsTable
              showUser={false}
              memberId={session.user.id}
              basePath="/employee/leave"
            />
          </div>
        </div>
      </PageContent>
    </>
  );
}
