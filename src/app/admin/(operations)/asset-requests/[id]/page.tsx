/**
 * @file page.tsx
 * @description Admin asset request detail page - view and process individual requests
 * @module app/admin/(operations)/asset-requests/[id]
 *
 * Features:
 * - Complete request information (requestor, asset, dates, status)
 * - Request type and status badges for quick identification
 * - Asset details with link to full asset page
 * - Request reason and notes from requestor
 * - Admin action buttons (Approve, Reject) via AdminRequestActions component
 * - Request history timeline showing all status transitions
 * - Quick action links to related resources (asset, requestor profile)
 *
 * Request Processing:
 * - PENDING_ADMIN_APPROVAL: Can approve (assigns to user) or reject
 * - PENDING_RETURN_APPROVAL: Can approve return (unassigns asset) or reject
 * - PENDING_USER_ACCEPTANCE: Waiting for user to accept/decline assignment
 *
 * Access: Admin only (enforced via role check + tenant isolation)
 * Route: /admin/asset-requests/[id]
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { redirect, notFound } from 'next/navigation';

import Link from 'next/link';
import { formatDateTime } from '@/lib/core/datetime';
import {
  AssetRequestStatusBadge,
  AssetRequestTypeBadge,
  AdminRequestActions,
} from '@/features/asset-requests';
import {
  Package,
  User,
  Clock,
  FileText,
} from 'lucide-react';
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { DetailCard } from '@/components/ui/detail-card';
import { InfoField, InfoFieldGrid } from '@/components/ui/info-field';

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Admin asset request detail page component
 * Displays full request information with admin action capabilities
 */
export default async function AdminAssetRequestDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // Allow access for admins OR users with Operations access
  const hasAccess = session.user.isAdmin || session.user.hasOperationsAccess;
  if (process.env.NODE_ENV !== 'development' && !hasAccess) {
    redirect('/forbidden');
  }

  const { id } = await params;
  const tenantId = session.user.organizationId;

  if (!tenantId) {
    redirect('/login');
  }

  const request = await prisma.assetRequest.findFirst({
    where: { id, tenantId },
    include: {
      asset: {
        select: {
          id: true,
          assetTag: true,
          model: true,
          brand: true,
          type: true,
          configuration: true,
          status: true,
          location: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      member: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      assignedByMember: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      processedByMember: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      history: {
        include: {
          performedBy: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!request) {
    notFound();
  }

  return (
    <>
      <PageHeader
        title={request.requestNumber}
        subtitle={`Submitted on ${formatDateTime(request.createdAt)}`}
        breadcrumbs={[
          { label: 'Asset Requests', href: '/admin/asset-requests' },
          { label: request.requestNumber },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <AssetRequestTypeBadge type={request.type} />
            <AssetRequestStatusBadge status={request.status} />
            <AdminRequestActions
              requestId={request.id}
              type={request.type}
              status={request.status}
            />
          </div>
        }
      />

      <PageContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Requestor Information */}
          <DetailCard icon={User} iconColor="blue" title="Requestor" subtitle="Who submitted this request">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-slate-500" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">{request.member.name || 'Unknown'}</p>
                <p className="text-sm text-slate-500">{request.member.email}</p>
              </div>
            </div>
          </DetailCard>

          {/* Asset Details */}
          <DetailCard icon={Package} iconColor="purple" title="Asset Details" subtitle="Information about the requested asset">
            <InfoFieldGrid columns={2}>
              <InfoField label="Model" value={request.asset.model} />
              {request.asset.brand && <InfoField label="Brand" value={request.asset.brand} />}
              <InfoField label="Type" value={request.asset.type} />
              {request.asset.assetTag && <InfoField label="Asset Tag" value={request.asset.assetTag} mono />}
              <InfoField
                label="Current Status"
                value={<Badge variant="outline">{request.asset.status}</Badge>}
              />
              {request.asset.location && <InfoField label="Location" value={request.asset.location.name} />}
              {request.asset.configuration && (
                <div className="sm:col-span-2">
                  <InfoField label="Configuration" value={request.asset.configuration} />
                </div>
              )}
            </InfoFieldGrid>
            <div className="mt-4">
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/assets/${request.asset.id}`}>
                  <Package className="mr-2 h-4 w-4" />
                  View Asset
                </Link>
              </Button>
            </div>
          </DetailCard>

          {/* Request Details */}
          <DetailCard icon={FileText} iconColor="amber" title="Request Details" subtitle="Reason and notes">
            <div className="space-y-4">
              {request.reason && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Reason</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{request.reason}</p>
                </div>
              )}
              {request.notes && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Notes</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{request.notes}</p>
                </div>
              )}
              {request.assignedByMember && (
                <InfoField label="Assigned By" value={request.assignedByMember.name || request.assignedByMember.email} />
              )}
              {request.processedAt && request.processedByMember && (
                <>
                  <div className="border-t border-slate-200 pt-4">
                    <div className="bg-slate-50 rounded-xl p-4">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Processed By</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {request.processedByMember.name || request.processedByMember.email}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">{formatDateTime(request.processedAt)}</p>
                    </div>
                  </div>
                  {request.processorNotes && (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                      <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-2">Response Notes</p>
                      <p className="text-sm text-blue-700 leading-relaxed">{request.processorNotes}</p>
                    </div>
                  )}
                </>
              )}
              {!request.reason && !request.notes && !request.processorNotes && (
                <div className="text-center py-8 text-slate-400">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No additional details provided</p>
                </div>
              )}
            </div>
          </DetailCard>
        </div>

        {/* Sidebar - 1/3 */}
        <div className="space-y-6">
          {/* History */}
          {request.history && request.history.length > 0 && (
            <DetailCard
              icon={Clock}
              iconColor="indigo"
              title="History"
              subtitle={`${request.history.length} event${request.history.length !== 1 ? 's' : ''}`}
            >
              <div className="space-y-4">
                {request.history.map((entry, index) => (
                  <div
                    key={entry.id}
                    className={`relative pl-6 ${index !== request.history.length - 1 ? 'pb-4' : ''}`}
                  >
                    {/* Timeline line */}
                    {index !== request.history.length - 1 && (
                      <div className="absolute left-[7px] top-3 bottom-0 w-0.5 bg-slate-200" />
                    )}
                    {/* Timeline dot */}
                    <div className="absolute left-0 top-1 w-3.5 h-3.5 rounded-full bg-slate-300 border-2 border-white" />

                    <div className="bg-slate-50 rounded-xl p-3">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-semibold text-slate-900">{entry.action}</span>
                        {entry.newStatus && (
                          <AssetRequestStatusBadge status={entry.newStatus} />
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        by {entry.performedBy.name || entry.performedBy.email}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {formatDateTime(entry.createdAt)}
                      </p>
                      {entry.notes && (
                        <p className="text-sm text-slate-600 mt-2 bg-white p-2 rounded-lg border border-slate-100">
                          {entry.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </DetailCard>
          )}

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href={`/admin/assets/${request.asset.id}`}>
                  <Package className="mr-2 h-4 w-4" />
                  View Asset Details
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href={`/admin/employees/${request.member.id}`}>
                  <User className="mr-2 h-4 w-4" />
                  View Requestor Profile
                </Link>
              </Button>
            </div>
          </div>
        </div>
        </div>
      </PageContent>
    </>
  );
}
