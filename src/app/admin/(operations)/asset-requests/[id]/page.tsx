import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { redirect, notFound } from 'next/navigation';
import { Role } from '@prisma/client';
import Link from 'next/link';
import { formatDateTime } from '@/lib/date-format';
import {
  AssetRequestStatusBadge,
  AssetRequestTypeBadge,
  AdminRequestActions,
} from '@/components/domains/operations/asset-requests';
import {
  Package,
  User,
  Clock,
  FileText,
  MapPin,
  Settings,
  Tag,
} from 'lucide-react';
import { PageHeader, PageContent } from '@/components/ui/page-header';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminAssetRequestDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  if (process.env.NODE_ENV !== 'development' && session.user.role !== Role.ADMIN) {
    redirect('/forbidden');
  }

  const { id } = await params;

  const request = await prisma.assetRequest.findUnique({
    where: { id },
    include: {
      asset: {
        select: {
          id: true,
          assetTag: true,
          model: true,
          brand: true,
          type: true,
          configuration: true,
          location: true,
          status: true,
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
      processedByUser: {
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
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Requestor</h2>
                <p className="text-sm text-slate-500">Who submitted this request</p>
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-slate-500" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{request.user.name || 'Unknown'}</p>
                  <p className="text-sm text-slate-500">{request.user.email}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Asset Details */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                <Package className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Asset Details</h2>
                <p className="text-sm text-slate-500">Information about the requested asset</p>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Model</p>
                  <p className="text-sm font-semibold text-slate-900">{request.asset.model}</p>
                </div>
                {request.asset.brand && (
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Brand</p>
                    <p className="text-sm font-semibold text-slate-900">{request.asset.brand}</p>
                  </div>
                )}
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Settings className="h-4 w-4 text-slate-400" />
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Type</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{request.asset.type}</p>
                </div>
                {request.asset.assetTag && (
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Tag className="h-4 w-4 text-slate-400" />
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Asset Tag</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 font-mono">{request.asset.assetTag}</p>
                  </div>
                )}
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Current Status</p>
                  <Badge variant="outline">{request.asset.status}</Badge>
                </div>
                {request.asset.location && (
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Location</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{request.asset.location}</p>
                  </div>
                )}
                {request.asset.configuration && (
                  <div className="sm:col-span-2 bg-slate-50 rounded-xl p-4">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Configuration</p>
                    <p className="text-sm font-semibold text-slate-900">{request.asset.configuration}</p>
                  </div>
                )}
              </div>
              <div className="mt-4">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/assets/${request.asset.id}`}>
                    <Package className="mr-2 h-4 w-4" />
                    View Asset
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Request Details */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                <FileText className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Request Details</h2>
                <p className="text-sm text-slate-500">Reason and notes</p>
              </div>
            </div>
            <div className="p-6 space-y-4">
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
              {request.assignedByUser && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Assigned By</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {request.assignedByUser.name || request.assignedByUser.email}
                  </p>
                </div>
              )}
              {request.processedAt && request.processedByUser && (
                <>
                  <div className="border-t border-slate-200 pt-4">
                    <div className="bg-slate-50 rounded-xl p-4">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Processed By</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {request.processedByUser.name || request.processedByUser.email}
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
          </div>
        </div>

        {/* Sidebar - 1/3 */}
        <div className="space-y-6">
          {/* History */}
          {request.history && request.history.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                  <Clock className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">History</h2>
                  <p className="text-sm text-slate-500">{request.history.length} event{request.history.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="p-6">
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
              </div>
            </div>
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
                <Link href={`/admin/employees/${request.user.id}`}>
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
