import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { redirect, notFound } from 'next/navigation';
import { Role, AssetRequestStatus } from '@prisma/client';
import Link from 'next/link';
import { AssetHistory } from '@/components/domains/operations/assets';
import { formatDate, formatDateTime } from '@/lib/date-format';
import { AssetCostBreakdown } from '@/components/domains/operations/assets/asset-cost-breakdown';
import { CloneAssetButton } from '@/components/domains/operations/assets/clone-asset-button';
import { DeleteAssetButton } from '@/components/domains/operations/assets/delete-asset-button';
import { AssetMaintenanceRecords } from '@/components/domains/operations/assets/asset-maintenance-records';
import { DepreciationCard } from '@/components/domains/operations/assets';
import { AssetAssignDialog } from '@/components/domains/operations/asset-requests';
import {
  Package,
  DollarSign,
  User,
  Users,
  MapPin,
  FileText,
  Clock,
  AlertTriangle,
  Wrench,
  Tag,
  Building2,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { PageHeader, PageHeaderButton, PageContent } from '@/components/ui/page-header';

interface Props {
  params: Promise<{ id: string }>;
}

// Status styles
const statusStyles: Record<string, { bg: string; text: string; icon: typeof CheckCircle }> = {
  IN_USE: { bg: 'bg-blue-100', text: 'text-blue-700', icon: CheckCircle },
  SPARE: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: Package },
  REPAIR: { bg: 'bg-amber-100', text: 'text-amber-700', icon: Wrench },
  DISPOSED: { bg: 'bg-slate-100', text: 'text-slate-700', icon: XCircle },
};

export default async function AssetDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  if (process.env.NODE_ENV !== 'development' && session.user.teamMemberRole !== 'ADMIN') {
    redirect('/forbidden');
  }

  const { id } = await params;

  const asset = await prisma.asset.findUnique({
    where: { id },
    include: {
      assignedMember: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      assetRequests: {
        where: {
          status: {
            in: [
              AssetRequestStatus.PENDING_ADMIN_APPROVAL,
              AssetRequestStatus.PENDING_USER_ACCEPTANCE,
              AssetRequestStatus.PENDING_RETURN_APPROVAL,
            ],
          },
        },
        select: {
          id: true,
          type: true,
          status: true,
          requestNumber: true,
        },
      },
    },
  });

  if (!asset) {
    notFound();
  }

  // Fetch the most recent assignment date from history if asset is assigned
  let assignmentDate = null;
  if (asset.assignedMemberId) {
    const mostRecentAssignment = await prisma.assetHistory.findFirst({
      where: {
        assetId: id,
        action: 'ASSIGNED',
        toMemberId: asset.assignedMemberId,
      },
      orderBy: { createdAt: 'desc' },
      select: { assignmentDate: true },
    });
    assignmentDate = mostRecentAssignment?.assignmentDate || null;
  }

  // Check if admin can assign this asset
  const hasPendingRequest = asset.assetRequests.length > 0;
  const canAssign = asset.status === 'SPARE' && !hasPendingRequest;

  const StatusIcon = statusStyles[asset.status]?.icon || Package;
  const statusBadgeVariant = asset.status === 'DISPOSED' ? 'default' :
    asset.status === 'IN_USE' ? 'info' :
    asset.status === 'SPARE' ? 'success' :
    asset.status === 'REPAIR' ? 'warning' : 'default';

  return (
    <>
      <PageHeader
        title={asset.model}
        subtitle={[asset.brand, asset.assetTag, asset.isShared ? 'Shared Resource' : null].filter(Boolean).join(' • ')}
        breadcrumbs={[
          { label: 'Assets', href: '/admin/assets' },
          { label: asset.model },
        ]}
        badge={{ text: asset.status.replace('_', ' '), variant: statusBadgeVariant }}
        actions={
          <div className="flex gap-2 flex-wrap">
            {canAssign && <AssetAssignDialog asset={asset} />}
            <PageHeaderButton href={`/admin/assets/${asset.id}/edit`} variant="primary">
              Edit Asset
            </PageHeaderButton>
            <CloneAssetButton assetId={asset.id} assetModel={asset.model} />
            <DeleteAssetButton assetId={asset.id} assetModel={asset.model} />
          </div>
        }
      />

      <PageContent>
        {/* Pending Requests Alert */}
        {hasPendingRequest && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-800">Pending Requests</h3>
              <div className="mt-1 space-y-1">
                {asset.assetRequests.map((req) => (
                  <p key={req.id} className="text-sm text-amber-700">
                    <Link href={`/admin/asset-requests/${req.id}`} className="underline hover:text-amber-900 font-medium">
                      {req.requestNumber}
                    </Link>
                    {' - '}
                    {req.status.replace(/_/g, ' ')}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information Card */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Package className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Basic Information</h2>
                <p className="text-sm text-slate-500">Core asset details</p>
              </div>
            </div>
            <div className="p-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Asset Tag</p>
                  <p className="font-mono font-semibold text-slate-900">{asset.assetTag || 'Not assigned'}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Type</p>
                  <p className="font-semibold text-slate-900">{asset.type}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Category</p>
                  <p className="font-semibold text-slate-900">{asset.category || 'Not specified'}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Serial Number</p>
                  <p className="font-mono font-semibold text-slate-900">{asset.serial || 'Not provided'}</p>
                </div>
              </div>

              {asset.configuration && (
                <div className="mt-4">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Configuration/Specs</p>
                  <div className="p-4 bg-slate-50 rounded-xl text-slate-700 whitespace-pre-wrap">{asset.configuration}</div>
                </div>
              )}
            </div>
          </div>

          {/* Financial & Procurement Card */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Financial & Procurement</h2>
                <p className="text-sm text-slate-500">Purchase and cost details</p>
              </div>
            </div>
            <div className="p-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Purchase Date</p>
                  <p className="font-semibold text-slate-900">{formatDate(asset.purchaseDate, 'Not specified')}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Cost/Value</p>
                  <p className="font-semibold text-slate-900">
                    {asset.price ? (
                      <>
                        {asset.priceCurrency === 'USD' ? '$' : 'QAR '}{Number(asset.price).toFixed(2)}
                      </>
                    ) : 'Not specified'}
                  </p>
                  {asset.priceCurrency === 'USD' && asset.priceQAR && (
                    <p className="text-xs text-slate-500 mt-1">≈ QAR {Number(asset.priceQAR).toFixed(2)}</p>
                  )}
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Warranty Expiry</p>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900">
                      {asset.warrantyExpiry ? formatDate(asset.warrantyExpiry) : 'Not specified'}
                    </p>
                    {asset.warrantyExpiry && asset.warrantyExpiry < new Date() && (
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-xs font-medium rounded-full">Expired</span>
                    )}
                  </div>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Supplier</p>
                  <p className="font-semibold text-slate-900">{asset.supplier || 'Not specified'}</p>
                </div>
                {asset.invoiceNumber && (
                  <div className="p-4 bg-slate-50 rounded-xl sm:col-span-2">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Invoice/PO Number</p>
                    <p className="font-mono font-semibold text-slate-900">{asset.invoiceNumber}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Acquisition Info */}
          {asset.acquisitionType === 'TRANSFERRED' && asset.transferNotes && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">Transfer Information</h2>
                  <p className="text-sm text-slate-500">Asset was transferred</p>
                </div>
              </div>
              <div className="p-5">
                <div className="p-4 bg-slate-50 rounded-xl text-slate-700 whitespace-pre-wrap">
                  {asset.transferNotes}
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {asset.notes && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <h2 className="font-semibold text-slate-900">Notes</h2>
              </div>
              <div className="p-5">
                <div className="p-4 bg-slate-50 rounded-xl text-slate-700 whitespace-pre-wrap">
                  {asset.notes}
                </div>
              </div>
            </div>
          )}

          {/* Asset Utilization */}
          <AssetCostBreakdown assetId={asset.id} purchaseDate={asset.purchaseDate} />

          {/* Depreciation */}
          <DepreciationCard assetId={asset.id} />

          {/* Maintenance Records */}
          <AssetMaintenanceRecords assetId={asset.id} readOnly={true} />

          {/* History */}
          <AssetHistory assetId={asset.id} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Assignment Card */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                asset.isShared ? 'bg-blue-100' : 'bg-indigo-100'
              }`}>
                {asset.isShared ? (
                  <Users className="h-5 w-5 text-blue-600" />
                ) : (
                  <User className="h-5 w-5 text-indigo-600" />
                )}
              </div>
              <h2 className="font-semibold text-slate-900">
                {asset.isShared ? 'Shared Resource' : 'Assignment'}
              </h2>
            </div>
            <div className="p-5">
              {asset.isShared ? (
                <div className="text-center py-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <p className="font-semibold text-slate-900 mb-1">Common/Shared Asset</p>
                  <p className="text-slate-500 text-sm">This asset is shared among team members</p>
                  {asset.location && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-xl">
                      <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">Location</p>
                      <p className="font-medium text-blue-800">{asset.location}</p>
                    </div>
                  )}
                </div>
              ) : asset.assignedMember ? (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                      <span className="text-indigo-600 font-semibold">
                        {asset.assignedMember.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??'}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{asset.assignedMember.name || 'Unknown User'}</p>
                      <p className="text-sm text-slate-500">{asset.assignedMember.email}</p>
                    </div>
                  </div>
                  {assignmentDate && (
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Assigned Since</p>
                      <p className="font-medium text-slate-900">{formatDate(assignmentDate)}</p>
                    </div>
                  )}
                  <Link href={`/admin/team/${asset.assignedMember.id}`} className="mt-4 block">
                    <Button variant="outline" size="sm" className="w-full">
                      View Profile
                    </Button>
                  </Link>
                </>
              ) : (
                <div className="text-center py-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <User className="h-6 w-6 text-slate-400" />
                  </div>
                  <p className="text-slate-500 text-sm">Unassigned</p>
                  {canAssign && (
                    <div className="mt-3">
                      <AssetAssignDialog asset={asset} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Location Card - Only show for non-shared assets since shared assets show location in the Shared Resource card */}
          {asset.location && !asset.isShared && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-rose-600" />
                </div>
                <h2 className="font-semibold text-slate-900">Location</h2>
              </div>
              <div className="p-5">
                <p className="text-slate-700">{asset.location}</p>
              </div>
            </div>
          )}

          {/* Acquisition Type Card */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-100 rounded-xl flex items-center justify-center">
                <Tag className="h-5 w-5 text-cyan-600" />
              </div>
              <h2 className="font-semibold text-slate-900">Acquisition</h2>
            </div>
            <div className="p-5">
              <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                asset.acquisitionType === 'NEW_PURCHASE'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {asset.acquisitionType === 'NEW_PURCHASE' ? 'New Purchase' : 'Transferred'}
              </span>
            </div>
          </div>

          {/* System Info Card */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                <Clock className="h-5 w-5 text-slate-600" />
              </div>
              <h2 className="font-semibold text-slate-900">System Info</h2>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Created</p>
                <p className="text-sm text-slate-700">{formatDateTime(asset.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Last Updated</p>
                <p className="text-sm text-slate-700">{formatDateTime(asset.updatedAt)}</p>
              </div>
            </div>
          </div>
        </div>
        </div>
      </PageContent>
    </>
  );
}
