import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import Link from 'next/link';
import { EmployeeListTable } from '@/components/employees';
import { ExpiryAlertsWidget, CelebrationsWidget } from '@/components/dashboard';
import { prisma } from '@/lib/core/prisma';

export default async function AdminEmployeesPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  if (process.env.NODE_ENV !== 'development' && session.user.role !== Role.ADMIN) {
    redirect('/forbidden');
  }

  // Get pending change requests count
  const pendingChangeRequests = await prisma.profileChangeRequest.count({
    where: { status: 'PENDING' }
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Employee Management</h1>
                <p className="text-gray-600">
                  Manage employee profiles, HR information, and document expiries
                </p>
              </div>
              <div className="flex gap-3">
                <Link href="/admin/employees/change-requests">
                  <Button variant="outline" className="relative">
                    Change Requests
                    {pendingChangeRequests > 0 && (
                      <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-1.5 py-0.5 min-w-[1.25rem] h-5">
                        {pendingChangeRequests}
                      </Badge>
                    )}
                  </Button>
                </Link>
                <Link href="/admin/employees/new">
                  <Button>+ Add Employee</Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Dashboard Widgets */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <CelebrationsWidget />
            <ExpiryAlertsWidget isAdmin={true} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Employees</CardTitle>
              <CardDescription>
                Complete employee directory with HR details, document expiries, and profile status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmployeeListTable />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
