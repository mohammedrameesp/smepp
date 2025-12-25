import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import Link from 'next/link';
import { EmployeeListTable } from '@/components/employees';
import { prisma } from '@/lib/core/prisma';
import { Users, UserPlus, FileWarning, Gift, Calendar, ClipboardList } from 'lucide-react';

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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl p-5 text-white shadow-lg shadow-blue-200/50">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Users className="h-5 w-5" />
              </div>
              <span className="text-3xl font-bold">{totalEmployees}</span>
            </div>
            <p className="text-sm font-medium">Total Employees</p>
            <p className="text-xs text-white/70">Active team members</p>
          </div>
        </div>

        <div className="relative overflow-hidden bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-5 text-white shadow-lg shadow-orange-200/50">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Calendar className="h-5 w-5" />
              </div>
              <span className="text-3xl font-bold">{onLeaveToday}</span>
            </div>
            <p className="text-sm font-medium">On Leave Today</p>
            <p className="text-xs text-white/70">Currently away</p>
          </div>
        </div>

        <Link href="/admin/employees/document-expiry">
          <div className="relative overflow-hidden bg-gradient-to-br from-rose-400 to-pink-500 rounded-2xl p-5 text-white shadow-lg shadow-rose-200/50 cursor-pointer hover:shadow-xl transition-shadow">
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <FileWarning className="h-5 w-5" />
                </div>
                <span className="text-3xl font-bold">{expiringDocumentsCount}</span>
              </div>
              <p className="text-sm font-medium">Expiring Documents</p>
              <p className="text-xs text-white/70">Next 30 days</p>
            </div>
          </div>
        </Link>

        <Link href="/admin/employees/change-requests">
          <div className="relative overflow-hidden bg-gradient-to-br from-purple-400 to-violet-500 rounded-2xl p-5 text-white shadow-lg shadow-purple-200/50 cursor-pointer hover:shadow-xl transition-shadow">
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <span className="text-3xl font-bold">{pendingChangeRequests}</span>
              </div>
              <p className="text-sm font-medium">Change Requests</p>
              <p className="text-xs text-white/70">Pending review</p>
            </div>
          </div>
        </Link>
      </div>

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
