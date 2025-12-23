import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import { LeaveRequestsTable } from '@/components/leave/leave-requests-table';

export default async function AdminLeaveRequestsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  if (process.env.NODE_ENV !== 'development' && session.user.role !== Role.ADMIN) {
    redirect('/forbidden');
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Leave Requests</h1>
          <p className="text-gray-600">
            View and manage all employee leave requests
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Leave Requests</CardTitle>
            <CardDescription>
              Filter and search through leave requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LeaveRequestsTable showUser={true} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
