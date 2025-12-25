import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import { LeaveRequestsTable } from '@/components/leave/leave-requests-table';
import { Calendar, Clock, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';

export default async function AdminLeaveRequestsPage() {
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

  const [pendingCount, approvedCount, rejectedCount, onLeaveToday] = await Promise.all([
    prisma.leaveRequest.count({ where: { tenantId, status: 'PENDING' } }),
    prisma.leaveRequest.count({ where: { tenantId, status: 'APPROVED' } }),
    prisma.leaveRequest.count({ where: { tenantId, status: 'REJECTED' } }),
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
          <h1 className="text-2xl font-bold text-slate-900">Leave Requests</h1>
          <p className="text-slate-500 text-sm">View and manage employee leave requests</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/leave/calendar"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Calendar className="h-4 w-4" />
            Calendar View
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="relative overflow-hidden bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-5 text-white shadow-lg shadow-orange-200/50">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Clock className="h-5 w-5" />
              </div>
              <span className="text-3xl font-bold">{pendingCount}</span>
            </div>
            <p className="text-sm font-medium">Pending</p>
            <p className="text-xs text-white/70">Awaiting approval</p>
          </div>
        </div>

        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl p-5 text-white shadow-lg shadow-emerald-200/50">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <CheckCircle className="h-5 w-5" />
              </div>
              <span className="text-3xl font-bold">{approvedCount}</span>
            </div>
            <p className="text-sm font-medium">Approved</p>
            <p className="text-xs text-white/70">This year</p>
          </div>
        </div>

        <div className="relative overflow-hidden bg-gradient-to-br from-rose-400 to-pink-500 rounded-2xl p-5 text-white shadow-lg shadow-rose-200/50">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <XCircle className="h-5 w-5" />
              </div>
              <span className="text-3xl font-bold">{rejectedCount}</span>
            </div>
            <p className="text-sm font-medium">Rejected</p>
            <p className="text-xs text-white/70">This year</p>
          </div>
        </div>

        <div className="relative overflow-hidden bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl p-5 text-white shadow-lg shadow-blue-200/50">
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
      </div>

      {/* Leave Requests Table */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-4 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">All Leave Requests</h2>
          <p className="text-sm text-slate-500">Filter and search through leave requests</p>
        </div>
        <div className="p-4">
          <LeaveRequestsTable showUser={true} />
        </div>
      </div>
    </div>
  );
}
