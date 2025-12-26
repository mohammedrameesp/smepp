import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { redirect } from 'next/navigation';
import { Role, AssetRequestStatus } from '@prisma/client';
import { AssetRequestListTable } from '@/components/domains/operations/asset-requests';
import { Clock, RotateCcw, UserCheck, Package } from 'lucide-react';

export default async function AdminAssetRequestsPage() {
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

  // Fetch all asset requests with related data
  const requests = await prisma.assetRequest.findMany({
    where: { tenantId },
    include: {
      asset: {
        select: {
          id: true,
          assetTag: true,
          model: true,
          brand: true,
          type: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      assignedByUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Calculate stats
  const pendingApproval = requests.filter(r => r.status === AssetRequestStatus.PENDING_ADMIN_APPROVAL);
  const pendingReturn = requests.filter(r => r.status === AssetRequestStatus.PENDING_RETURN_APPROVAL);
  const pendingAcceptance = requests.filter(r => r.status === AssetRequestStatus.PENDING_USER_ACCEPTANCE);
  const totalPending = pendingApproval.length + pendingReturn.length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Asset Requests</h1>
        <p className="text-slate-500 text-sm">Manage asset requests, assignments, and returns</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="relative overflow-hidden bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-4 text-white shadow-lg shadow-orange-200/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-200">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                <Clock className="h-4 w-4" />
              </div>
              <span className="text-3xl font-bold">{pendingApproval.length}</span>
            </div>
            <p className="text-sm font-medium">Pending Requests</p>
            <p className="text-xs text-white/80">Employee requests</p>
          </div>
        </div>

        <div className="relative overflow-hidden bg-gradient-to-br from-rose-400 to-pink-500 rounded-2xl p-4 text-white shadow-lg shadow-rose-200/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-200">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                <RotateCcw className="h-4 w-4" />
              </div>
              <span className="text-3xl font-bold">{pendingReturn.length}</span>
            </div>
            <p className="text-sm font-medium">Pending Returns</p>
            <p className="text-xs text-white/80">Return requests</p>
          </div>
        </div>

        <div className="relative overflow-hidden bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl p-4 text-white shadow-lg shadow-blue-200/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-200">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                <UserCheck className="h-4 w-4" />
              </div>
              <span className="text-3xl font-bold">{pendingAcceptance.length}</span>
            </div>
            <p className="text-sm font-medium">Awaiting User</p>
            <p className="text-xs text-white/80">User acceptance</p>
          </div>
        </div>

        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl p-4 text-white shadow-lg shadow-emerald-200/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-200">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                <Package className="h-4 w-4" />
              </div>
              <span className="text-3xl font-bold">{requests.length}</span>
            </div>
            <p className="text-sm font-medium">Total Requests</p>
            <p className="text-xs text-white/80">All time</p>
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-4 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">All Requests ({requests.length})</h2>
          <p className="text-sm text-slate-500">Complete list of asset requests, assignments, and returns</p>
        </div>
        <div className="p-4">
          {requests.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">No requests yet</h3>
              <p className="text-slate-500 text-sm">Asset requests will appear here</p>
            </div>
          ) : (
            <AssetRequestListTable
              requests={requests}
              isAdmin={true}
              showUser={true}
              basePath="/admin/asset-requests"
            />
          )}
        </div>
      </div>
    </div>
  );
}
