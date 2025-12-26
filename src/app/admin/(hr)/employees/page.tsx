import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import Link from 'next/link';
import { EmployeeListTable } from '@/components/employees';
import { prisma } from '@/lib/core/prisma';
import { Users, UserPlus, FileWarning, Calendar, ClipboardList } from 'lucide-react';
import { StatsCard, StatsCardGrid } from '@/components/ui/stats-card';

export default async function AdminEmployeesPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  if (process.env.NODE_ENV !== 'development' && session.user.role !== Role.ADMIN) {
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
    prisma.user.count({
      where: {
        role: { in: ['ADMIN', 'EMPLOYEE'] },
        organizationMemberships: { some: { organizationId: tenantId } },
      },
    }),
    prisma.profileChangeRequest.count({
      where: { tenantId, status: 'PENDING' },
    }),
    // Count employees with any document expiring in next 30 days
    prisma.hRProfile.count({
      where: {
        tenantId,
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
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Employees</h1>
          <p className="text-slate-500 text-sm">Manage employee profiles and HR information</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/employees/change-requests"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <ClipboardList className="h-4 w-4" />
            Change Requests
            {pendingChangeRequests > 0 && (
              <span className="bg-rose-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {pendingChangeRequests}
              </span>
            )}
          </Link>
          <Link
            href="/admin/employees/new"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            Add Employee
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCardGrid columns={4} className="mb-6">
        <StatsCard
          title="Total Employees"
          subtitle="Active team members"
          value={totalEmployees}
          icon={Users}
          color="blue"
        />
        <StatsCard
          title="On Leave Today"
          subtitle="Currently away"
          value={onLeaveToday}
          icon={Calendar}
          color="amber"
        />
        <StatsCard
          title="Expiring Documents"
          subtitle="Next 30 days"
          value={expiringDocumentsCount}
          icon={FileWarning}
          color="rose"
          href="/admin/employees/document-expiry"
        />
        <StatsCard
          title="Change Requests"
          subtitle="Pending review"
          value={pendingChangeRequests}
          icon={ClipboardList}
          color="purple"
          href="/admin/employees/change-requests"
        />
      </StatsCardGrid>

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
    </div>
  );
}
