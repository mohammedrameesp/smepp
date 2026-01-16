/**
 * @file page.tsx
 * @description Admin page for managing deleted (trashed) employees
 * @module app/admin/(hr)/employees/deleted
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { redirect } from 'next/navigation';
import { PageHeader, PageContent, PageHeaderButton } from '@/components/ui/page-header';
import { DeletedEmployeesTable } from './deleted-employees-table';

export default async function DeletedEmployeesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.organizationId) {
    redirect('/login');
  }

  const tenantId = session.user.organizationId;

  const deletedEmployees = await prisma.teamMember.findMany({
    where: {
      tenantId,
      isDeleted: true,
    },
    orderBy: { deletedAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      employeeCode: true,
      designation: true,
      department: true,
      deletedAt: true,
      scheduledDeletionAt: true,
    },
  });

  // Add recovery deadline info (30 days from deletion)
  const employeesWithDeadline = deletedEmployees.map(employee => ({
    ...employee,
    daysRemaining: employee.scheduledDeletionAt
      ? Math.max(0, Math.ceil((new Date(employee.scheduledDeletionAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : employee.deletedAt
        ? Math.max(0, Math.ceil((new Date(employee.deletedAt).getTime() + 30 * 24 * 60 * 60 * 1000 - Date.now()) / (1000 * 60 * 60 * 24)))
        : 0,
  }));

  return (
    <>
      <PageHeader
        title="Deleted Employees"
        subtitle={`${deletedEmployees.length} employee${deletedEmployees.length !== 1 ? 's' : ''} in trash - Auto-deleted after 30 days`}
        breadcrumbs={[
          { label: 'Employees', href: '/admin/employees' },
          { label: 'Deleted' },
        ]}
        actions={
          <PageHeaderButton href="/admin/employees" variant="outline">
            Back to Employees
          </PageHeaderButton>
        }
      />

      <PageContent>
        <DeletedEmployeesTable employees={employeesWithDeadline} />
      </PageContent>
    </>
  );
}
