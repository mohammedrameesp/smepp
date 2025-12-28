import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { redirect } from 'next/navigation';
import { Role, AssetRequestStatus } from '@prisma/client';
import { AssetRequestListTable } from '@/components/domains/operations/asset-requests';
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { Package } from 'lucide-react';

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

  return (
    <>
      <PageHeader
        title="Asset Requests"
        subtitle="Manage asset requests, assignments, and returns"
      >
        {/* Summary Chips */}
        <div className="flex flex-wrap items-center gap-3 mt-4">
          {pendingApproval.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 rounded-lg">
              <span className="text-amber-400 text-sm font-medium">
                {pendingApproval.length} pending approval
              </span>
            </div>
          )}
          {pendingReturn.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/20 rounded-lg">
              <span className="text-rose-400 text-sm font-medium">
                {pendingReturn.length} pending return
              </span>
            </div>
          )}
          {pendingAcceptance.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 rounded-lg">
              <span className="text-blue-400 text-sm font-medium">
                {pendingAcceptance.length} awaiting acceptance
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-500/20 rounded-lg">
            <span className="text-slate-300 text-sm font-medium">
              {requests.length} total requests
            </span>
          </div>
        </div>
      </PageHeader>

      <PageContent>

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
      </PageContent>
    </>
  );
}
