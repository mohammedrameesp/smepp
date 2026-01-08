/**
 * @file page.tsx
 * @description Admin asset detail page - comprehensive view of a single asset
 * @module app/admin/(operations)/assets/[id]
 *
 * Features:
 * - Complete asset information (model, brand, type, category, status)
 * - Purchase details (price, currency, purchase date, supplier)
 * - Assignment information (current assignee, history)
 * - Warranty tracking with expiry alerts
 * - Depreciation card with IFRS-compliant calculations
 * - Maintenance records management
 * - Asset utilization metrics
 * - Asset history timeline
 * - Quick actions: Edit, Clone, Delete, Assign, Dispose
 *
 * Access: Admin only
 * Route: /admin/assets/[id]
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { redirect, notFound } from 'next/navigation';
import { AssetRequestStatus } from '@prisma/client';
import Link from 'next/link';
import {
  AssetHistory,
  AssetCostBreakdown,
  CloneAssetButton,
  DeleteAssetButton,
  AssetMaintenanceRecords,
  DepreciationCard,
  AssetStatusCard,
} from '@/features/assets';
import { formatDate, formatDateTime } from '@/lib/date-format';
import { formatCurrency } from '@/lib/core/currency';
import { AssetAssignDialog } from '@/features/asset-requests';
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
  TrendingUp,
  TrendingDown,
  Trash2,
} from 'lucide-react';
import { PageHeader, PageHeaderButton, PageContent } from '@/components/ui/page-header';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AssetDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  if (process.env.NODE_ENV !== 'development' && session.user.teamMemberRole !== 'ADMIN') {
    redirect('/forbidden');
  }

  const { id } = await params;
  const tenantId = session.user.organizationId;

  const asset = await prisma.asset.findFirst({
    where: { id, tenantId },
    include: {
      assignedMember: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      disposedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      assetCategory: {
        select: {
          id: true,
          code: true,
          name: true,
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
          createdAt: true,
          member: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      location: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!asset) {
    notFound();
  }

  // Assignment date is stored directly on the asset
  // Note: Assignment APIs should always set this field
  const assignmentDate = asset.assignmentDate;

  // Check if admin can assign this asset
  const hasPendingRequest = asset.assetRequests.length > 0;
  const canAssign = asset.status === 'SPARE' && !hasPendingRequest;

  // Find pending assignment request for display in Assignment Card
  // Includes both PENDING_ADMIN_APPROVAL and PENDING_USER_ACCEPTANCE
  const pendingAssignmentRequest = asset.assetRequests.find(
    req => (req.status === 'PENDING_USER_ACCEPTANCE' || req.status === 'PENDING_ADMIN_APPROVAL')
      && req.type === 'ADMIN_ASSIGNMENT'
  );

  return (
    <>
      <PageHeader
        title={asset.model}
        subtitle={[asset.brand, asset.assetTag, asset.isShared ? 'Shared Resource' : null].filter(Boolean).join(' • ')}
        breadcrumbs={[
          { label: 'Assets', href: '/admin/assets' },
          { label: asset.model },
        ]}
        actions={
          <div className="flex gap-2 flex-wrap">
            <PageHeaderButton href={`/admin/assets/${asset.id}/edit`} variant="primary">
              Edit Asset
            </PageHeaderButton>
            <CloneAssetButton assetId={asset.id} assetModel={asset.model} />
            <DeleteAssetButton assetId={asset.id} assetModel={asset.model} />
          </div>
        }
      />

      <PageContent>
        {/* Alerts Section */}
        <div className="space-y-4 mb-6">
          {/* Pending Requests Alert */}
          {hasPendingRequest && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
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

          {/* Warranty Expiry Alert */}
          {asset.warrantyExpiry && (() => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const expiryDate = new Date(asset.warrantyExpiry);
            expiryDate.setHours(0, 0, 0, 0);
            const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            const isExpired = daysUntilExpiry < 0;
            const isExpiringSoon = daysUntilExpiry >= 0 && daysUntilExpiry <= 30;

            if (!isExpired && !isExpiringSoon) return null;

            return (
              <div className={`rounded-2xl p-4 flex items-start gap-3 ${
                isExpired
                  ? 'bg-rose-50 border border-rose-200'
                  : 'bg-amber-50 border border-amber-200'
              }`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isExpired ? 'bg-rose-100' : 'bg-amber-100'
                }`}>
                  <AlertTriangle className={`h-5 w-5 ${isExpired ? 'text-rose-600' : 'text-amber-600'}`} />
                </div>
                <div>
                  <h3 className={`font-semibold ${isExpired ? 'text-rose-800' : 'text-amber-800'}`}>
                    {isExpired ? 'Warranty Expired' : 'Warranty Expiring Soon'}
                  </h3>
                  <p className={`text-sm mt-1 ${isExpired ? 'text-rose-700' : 'text-amber-700'}`}>
                    {isExpired
                      ? `Warranty expired on ${formatDate(asset.warrantyExpiry)}`
                      : `Warranty expires on ${formatDate(asset.warrantyExpiry)} (${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'} remaining)`
                    }
                  </p>
                </div>
              </div>
            );
          })()}
        </div>

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
                  <p className="font-mono font-semibold text-slate-900">{asset.assetTag || 'Not specified'}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Type</p>
                  <p className="font-semibold text-slate-900">{asset.type}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Category</p>
                  <p className="font-semibold text-slate-900">{asset.assetCategory?.name || 'Not specified'}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Brand / Manufacturer</p>
                  <p className="font-semibold text-slate-900">{asset.brand || 'Not specified'}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Model / Version</p>
                  <p className="font-semibold text-slate-900">{asset.model}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Serial Number</p>
                  <p className="font-mono font-semibold text-slate-900">{asset.serial || 'Not specified'}</p>
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
                    {asset.price ? formatCurrency(Number(asset.price), asset.priceCurrency) : 'Not specified'}
                  </p>
                  {asset.priceCurrency && asset.priceCurrency !== 'QAR' && asset.priceQAR && (
                    <p className="text-xs text-slate-500 mt-1">≈ {formatCurrency(Number(asset.priceQAR), 'QAR')}</p>
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
          <AssetCostBreakdown assetId={asset.id} isShared={asset.isShared} />

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
                      <p className="font-medium text-blue-800">{asset.location.name}</p>
                    </div>
                  )}
                </div>
              ) : asset.assignedMember ? (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                      <span className="text-indigo-600 font-semibold">
                        {(() => {
                          const name = asset.assignedMember?.name;
                          if (!name || !name.trim()) return '??';
                          const parts = name.trim().split(/\s+/).filter(Boolean);
                          if (parts.length === 0) return '??';
                          return parts.map(n => n[0]).join('').slice(0, 2).toUpperCase();
                        })()}
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
                  <Link href={`/admin/employees/${asset.assignedMember.id}`} className="mt-4 block">
                    <Button variant="outline" size="sm" className="w-full">
                      View Profile
                    </Button>
                  </Link>
                </>
              ) : pendingAssignmentRequest ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Clock className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-amber-800">
                        {pendingAssignmentRequest.status === 'PENDING_ADMIN_APPROVAL' ? 'Pending Admin Approval' : 'Pending Acceptance'}
                      </p>
                      <p className="text-sm text-amber-600">
                        {pendingAssignmentRequest.status === 'PENDING_ADMIN_APPROVAL'
                          ? `Assignment to ${pendingAssignmentRequest.member?.name || pendingAssignmentRequest.member?.email || 'user'} awaiting approval`
                          : `Waiting for ${pendingAssignmentRequest.member?.name || pendingAssignmentRequest.member?.email || 'user'} to accept`}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 text-center">
                    Request #{pendingAssignmentRequest.requestNumber}
                  </div>
                  <Link href={`/admin/asset-requests/${pendingAssignmentRequest.id}`} className="block">
                    <Button variant="outline" size="sm" className="w-full">
                      View Request
                    </Button>
                  </Link>
                </div>
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

          {/* Status Card */}
          <AssetStatusCard status={asset.status} />

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
                <p className="text-slate-700">{asset.location.name}</p>
              </div>
            </div>
          )}

          {/* Disposal Info Card - Only show for disposed assets */}
          {asset.status === 'DISPOSED' && asset.disposalDate && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                  <Trash2 className="h-5 w-5 text-slate-600" />
                </div>
                <h2 className="font-semibold text-slate-900">Disposal Information</h2>
              </div>
              <div className="p-5 space-y-3">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Disposal Date</p>
                  <p className="text-sm font-medium text-slate-900">{formatDate(asset.disposalDate)}</p>
                </div>
                {asset.disposalMethod && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Method</p>
                    <p className="text-sm font-medium text-slate-900">{asset.disposalMethod.replace(/_/g, ' ')}</p>
                  </div>
                )}
                {asset.disposalProceeds !== null && asset.disposalProceeds !== undefined && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Proceeds</p>
                    <p className="text-sm font-medium text-slate-900">QAR {Number(asset.disposalProceeds).toFixed(2)}</p>
                  </div>
                )}
                {asset.disposalNetBookValue !== null && asset.disposalNetBookValue !== undefined && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">NBV at Disposal</p>
                    <p className="text-sm font-medium text-slate-900">QAR {Number(asset.disposalNetBookValue).toFixed(2)}</p>
                  </div>
                )}
                {asset.disposalGainLoss !== null && asset.disposalGainLoss !== undefined && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                      {Number(asset.disposalGainLoss) >= 0 ? 'Gain on Disposal' : 'Loss on Disposal'}
                    </p>
                    <p className={`text-sm font-medium flex items-center gap-1 ${Number(asset.disposalGainLoss) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {Number(asset.disposalGainLoss) >= 0 ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                      QAR {Math.abs(Number(asset.disposalGainLoss)).toFixed(2)}
                    </p>
                  </div>
                )}
                {asset.disposedBy && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Disposed By</p>
                    <p className="text-sm font-medium text-slate-900">{asset.disposedBy.name || asset.disposedBy.email}</p>
                  </div>
                )}
                {asset.disposalNotes && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Notes</p>
                    <p className="text-sm text-slate-700">{asset.disposalNotes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

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
