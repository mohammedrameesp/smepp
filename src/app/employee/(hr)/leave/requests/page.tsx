import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { LeaveRequestsTable } from '@/components/domains/hr/leave';

export default async function EmployeeLeaveRequestsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">My Leave Requests</h1>
              <p className="text-gray-600">
                View and manage all your leave requests
              </p>
            </div>
            <Link href="/employee/leave/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Request
              </Button>
            </Link>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Requests</CardTitle>
            <CardDescription>
              Filter and search through your leave requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LeaveRequestsTable
              showUser={false}
              memberId={session.user.id}
              basePath="/employee/leave"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
