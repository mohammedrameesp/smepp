import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import Link from 'next/link';
import { ProjectListTable } from '@/components/projects/project-list-table';

export default async function AdminProjectsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  if (process.env.NODE_ENV !== 'development' && session.user.role !== Role.ADMIN) {
    redirect('/forbidden');
  }

  // Require organization context for tenant isolation
  if (!session.user.organizationId) {
    redirect('/forbidden');
  }

  const tenantId = session.user.organizationId;

  // Fetch stats (filtered by tenant)
  const [
    totalProjects,
    activeProjects,
    statusCounts,
  ] = await Promise.all([
    prisma.project.count({ where: { tenantId } }),
    prisma.project.count({ where: { tenantId, status: 'ACTIVE' } }),
    prisma.project.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: { _all: true },
    }),
  ]);

  // Get status breakdown
  const statusMap = statusCounts.reduce((acc, item) => {
    acc[item.status] = item._count._all;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Project Management</h1>
                <p className="text-gray-600">
                  Manage projects, budgets, and financial tracking
                </p>
              </div>
              <Link href="/admin/projects/new">
                <Button>+ New Project</Button>
              </Link>
            </div>

            {/* Key Figures */}
            <div className="grid md:grid-cols-4 gap-3 mb-6">
              <Card>
                <CardHeader className="pb-1 pt-3 px-4">
                  <CardTitle className="text-xs font-medium text-gray-600">Total Projects</CardTitle>
                </CardHeader>
                <CardContent className="pb-3 px-4">
                  <div className="text-2xl font-bold text-gray-900">{totalProjects}</div>
                  <p className="text-xs text-gray-500">
                    {activeProjects} active
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-1 pt-3 px-4">
                  <CardTitle className="text-xs font-medium text-gray-600">By Status</CardTitle>
                </CardHeader>
                <CardContent className="pb-3 px-4">
                  <div className="text-sm space-y-0.5">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Planning:</span>
                      <span className="font-medium">{statusMap['PLANNING'] || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Active:</span>
                      <span className="font-medium text-green-600">{statusMap['ACTIVE'] || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Completed:</span>
                      <span className="font-medium">{statusMap['COMPLETED'] || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Projects</CardTitle>
              <CardDescription>
                Complete list of projects with filters and sorting
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProjectListTable />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
