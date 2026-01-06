/**
 * @file page.tsx
 * @description Employee asset detail page - modern PageHeader design with card-based layout
 * @module app/employee/(operations)/assets/[id]
 *
 * Features:
 * - Modern PageHeader layout with breadcrumbs and status badge
 * - Two-column grid (main content + sidebar)
 * - Colored icon headers for each card
 * - Complete asset information (excludes sensitive financial data)
 * - Request/Return action buttons based on status
 * - Pending request and warranty expiry alerts
 * - Read-only maintenance records
 * - Assignment information with "You" badge for current user
 *
 * Security:
 * - Hides: Price, Serial Number, Supplier, Invoice, Disposal Info, Depreciation
 *
 * Access: All authenticated employees (tenant-scoped)
 * Route: /employee/assets/[id]
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { AssetRequestStatus } from '@prisma/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { formatDate } from '@/lib/date-format';
import { AssetMaintenanceRecords } from '@/components/domains/operations/assets/asset-maintenance-records';
import { AssetRequestDialog, AssetReturnDialog } from '@/components/domains/operations/asset-requests';
import {
  Package,
  DollarSign,
  User,
  Users,
  MapPin,
  FileText,
  AlertTriangle,
  Wrench,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { PageHeader, PageContent } from '@/components/ui/page-header';

interface Props {
  params: Promise<{ id: string }>;
}

/** Status badge styles mapping for visual consistency */
const statusStyles: Record<string, { bg: string; text: string; icon: typeof CheckCircle; badgeVariant: 'default' | 'info' | 'success' | 'warning' }> = {
  IN_USE: { bg: 'bg-blue-100', text: 'text-blue-700', icon: CheckCircle, badgeVariant: 'info' },
  SPARE: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: Package, badgeVariant: 'success' },
  REPAIR: { bg: 'bg-amber-100', text: 'text-amber-700', icon: Wrench, badgeVariant: 'warning' },
  DISPOSED: { bg: 'bg-slate-100', text: 'text-slate-700', icon: XCircle, badgeVariant: 'default' },
};

/**
 * Employee asset detail page component
 * Displays asset details with modern PageHeader design
 */
export default async function EmployeeAssetDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  const tenantId = session.user.organizationId;
  if (!tenantId) {
    redirect('/login');
  }

  const { id } = await params;

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
      assetCategory: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
      maintenanceRecords: true,
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
          memberId: true,
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

  const isAssignedToMe = asset.assignedMemberId === session?.user?.id;

  // Check if user can request this asset (SPARE and no pending requests)
  const hasPendingRequest = asset.assetRequests.length > 0;
  const myPendingRequest = asset.assetRequests.find(r => r.memberId === session.user.id);
  const canRequest = asset.status === 'SPARE' && !hasPendingRequest;

  // Check if user can return this asset (assigned to them, IN_USE, no pending return)
  const hasPendingReturn = asset.assetRequests.some(
    r => r.type === 'RETURN_REQUEST' && r.status === 'PENDING_RETURN_APPROVAL' && r.memberId === session.user.id
  );
  const canReturn = isAssignedToMe && asset.status === 'IN_USE' && !hasPendingReturn;

  const statusStyle = statusStyles[asset.status] || statusStyles.IN_USE;

  return (
    <>
      <PageHeader
        title={asset.model}
        subtitle={[asset.brand, asset.assetTag, asset.isShared ? 'Shared Resource' : null].filter(Boolean).join(' • ')}
        breadcrumbs={[
          { label: 'Assets', href: '/employee/assets' },
          { label: asset.model },
        ]}
        badge={{ text: asset.status.replace('_', ' '), variant: statusStyle.badgeVariant }}
        actions={
          <div className="flex gap-2 flex-wrap">
            {canRequest && <AssetRequestDialog asset={asset} />}
            {canReturn && <AssetReturnDialog asset={asset} />}
            <Link href="/employee/assets">
              <Button variant="outline">Back to Assets</Button>
            </Link>
            {isAssignedToMe && (
              <Link href="/employee/my-assets">
                <Button variant="outline">My Assets</Button>
              </Link>
            )}
          </div>
        }
      />

      <PageContent>
        {/* Alerts Section */}
        <div className="space-y-4 mb-6">
          {/* Pending Request Alert */}
          {myPendingRequest && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-amber-800">
                  {myPendingRequest.status === 'PENDING_USER_ACCEPTANCE'
                    ? 'This asset has been assigned to you'
                    : myPendingRequest.status === 'PENDING_ADMIN_APPROVAL'
                    ? 'Your request for this asset is pending approval'
                    : 'Your return request is pending approval'}
                </h3>
                <p className="text-sm text-amber-700 mt-1">
                  <Link href={`/employee/asset-requests/${myPendingRequest.id}`} className="underline hover:text-amber-900 font-medium">
                    View request details
                  </Link>
                </p>
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
                  <div className="p-4 bg-slate-50 rounded-xl sm:col-span-2">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Model / Version</p>
                    <p className="font-semibold text-slate-900">{asset.model}</p>
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

            {/* Procurement Card */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">Procurement Information</h2>
                  <p className="text-sm text-slate-500">Purchase and warranty details</p>
                </div>
              </div>
              <div className="p-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Purchase Date</p>
                    <p className="font-semibold text-slate-900">{formatDate(asset.purchaseDate, 'Not specified')}</p>
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

            {/* Maintenance Records */}
            <AssetMaintenanceRecords assetId={asset.id} readOnly={true} />
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
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-900">{asset.assignedMember.name || 'Unknown User'}</p>
                          {isAssignedToMe && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              You
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-500">{asset.assignedMember.email}</p>
                      </div>
                    </div>
                    {asset.assignmentDate && (
                      <div className="p-3 bg-slate-50 rounded-xl">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Assigned Since</p>
                        <p className="font-medium text-slate-900">{formatDate(asset.assignmentDate)}</p>
                      </div>
                    )}
                    {isAssignedToMe && (
                      <Link href="/employee/my-assets?tab=assets" className="mt-4 block">
                        <Button variant="outline" size="sm" className="w-full">
                          View My Assets
                        </Button>
                      </Link>
                    )}
                  </>
                ) : (
                  <div className="text-center py-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <User className="h-6 w-6 text-slate-400" />
                    </div>
                    <p className="text-slate-500 text-sm">Unassigned</p>
                  </div>
                )}
              </div>
            </div>

            {/* Location Card - Only show for non-shared assets since shared assets show location in the Assignment card */}
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
          </div>
        </div>
      </PageContent>
    </>
  );
}
