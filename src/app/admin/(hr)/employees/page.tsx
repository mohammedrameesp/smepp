import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { EmployeeListTable } from '@/components/domains/hr/employees';
import { prisma } from '@/lib/core/prisma';
import { UserPlus, ClipboardList, AlertTriangle, Calendar } from 'lucide-react';
import { PageHeader, PageHeaderButton, PageContent } from '@/components/ui/page-header';

export default async function AdminEmployeesPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  if (process.env.NODE_ENV !== 'development' && session.user.role !== 'ADMIN') {
    redirect('/forbidden');
  }

  if (!session.user.organizationId) {
    redirect('/login');
  }

  const tenantId = session.user.organizationId;
  const today = new Date();
  const thirtyDaysFromNow = new Date(today);
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const [
    totalEmployees,
    pendingChangeRequests,
    expiringDocumentsCount,
    onLeaveToday,
  ] = await Promise.all([
    // Count employees using TeamMember model
    prisma.teamMember.count({
      where: {
        tenantId,
        isEmployee: true,
        isDeleted: false,
      },
    }),
    prisma.profileChangeRequest.count({
      where: { tenantId, status: 'PENDING' },
    }),
    // Count expiring documents directly from TeamMember
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
    prisma.leaveRequest.count({
      where: {
        tenantId,
        status: 'APPROVED',
        startDate: { lte: today },
        endDate: { gte: today },
      },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Employees"
        subtitle="Manage employee profiles and HR information"
        actions={
          <>
            <PageHeaderButton href="/admin/employees/change-requests" variant="secondary">
              <ClipboardList className="h-4 w-4" />
              Change Requests
              {pendingChangeRequests > 0 && (
                <span className="bg-rose-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {pendingChangeRequests}
                </span>
              )}
            </PageHeaderButton>
            <PageHeaderButton href="/admin/employees/new" variant="primary">
              <UserPlus className="h-4 w-4" />
              Add Employee
            </PageHeaderButton>
          </>
        }
      >
        {/* Stats Summary */}
        <div className="flex flex-wrap items-center gap-4 mt-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 rounded-lg">
            <span className="text-blue-400 text-sm font-medium">{totalEmployees} employees</span>
          </div>
          {onLeaveToday > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 rounded-lg">
              <Calendar className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-amber-400 text-sm font-medium">{onLeaveToday} on leave today</span>
            </div>
          )}
          {expiringDocumentsCount > 0 && (
            <Link
              href="/admin/employees/document-expiry"
              className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 rounded-lg transition-colors"
            >
              <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
              <span className="text-rose-400 text-sm font-medium">{expiringDocumentsCount} expiring documents</span>
            </Link>
          )}
          {pendingChangeRequests > 0 && (
            <Link
              href="/admin/employees/change-requests"
              className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg transition-colors"
            >
              <span className="text-purple-400 text-sm font-medium">{pendingChangeRequests} change requests</span>
            </Link>
          )}
        </div>
      </PageHeader>

      <PageContent>
        {/* Employee Table */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-4 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">All Employees</h2>
            <p className="text-sm text-slate-500">Complete directory with HR details and document status</p>
          </div>
          <div className="p-4">
            <EmployeeListTable />
          </div>
        </div>
      </PageContent>
    </>
  );
}
