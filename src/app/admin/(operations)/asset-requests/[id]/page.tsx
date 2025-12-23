import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { redirect, notFound } from 'next/navigation';
import { Role } from '@prisma/client';
import Link from 'next/link';
import { formatDateTime } from '@/lib/date-format';
import {
  AssetRequestStatusBadge,
  AssetRequestTypeBadge,
  AdminRequestActions,
} from '@/components/domains/operations/asset-requests';
import { ArrowLeft, Package, User, Clock, FileText } from 'lucide-react';

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
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <Link href="/admin/asset-requests" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Requests
            </Link>

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  {request.requestNumber}
                  <AssetRequestTypeBadge type={request.type} />
                  <AssetRequestStatusBadge status={request.status} />
                </h1>
                <p className="text-gray-600 mt-1">
                  Submitted on {formatDateTime(request.createdAt)}
                </p>
              </div>

              <AdminRequestActions
                requestId={request.id}
                type={request.type}
                status={request.status}
              />
            </div>
          </div>

          <div className="grid gap-6">
            {/* User Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Requestor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="h-6 w-6 text-gray-500" />
                  </div>
                  <div>
                    <p className="font-medium">{request.user.name || 'Unknown'}</p>
                    <p className="text-sm text-gray-500">{request.user.email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Asset Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Asset Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">Model</label>
                    <p className="font-medium">{request.asset.model}</p>
                  </div>
                  {request.asset.brand && (
                    <div>
                      <label className="text-sm text-gray-500">Brand</label>
                      <p className="font-medium">{request.asset.brand}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm text-gray-500">Type</label>
                    <p className="font-medium">{request.asset.type}</p>
                  </div>
                  {request.asset.assetTag && (
                    <div>
                      <label className="text-sm text-gray-500">Asset Tag</label>
                      <p className="font-mono">{request.asset.assetTag}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm text-gray-500">Current Status</label>
                    <p className="font-medium">{request.asset.status}</p>
                  </div>
                  {request.asset.location && (
                    <div>
                      <label className="text-sm text-gray-500">Location</label>
                      <p className="font-medium">{request.asset.location}</p>
                    </div>
                  )}
                  {request.asset.configuration && (
                    <div className="md:col-span-2">
                      <label className="text-sm text-gray-500">Configuration</label>
                      <p className="font-medium">{request.asset.configuration}</p>
                    </div>
                  )}
                </div>
                <div className="mt-4">
                  <Link href={`/admin/assets/${request.asset.id}`}>
                    <Button variant="outline" size="sm">View Asset</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Request Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Request Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {request.reason && (
                  <div>
                    <label className="text-sm text-gray-500">Reason</label>
                    <p className="mt-1">{request.reason}</p>
                  </div>
                )}
                {request.notes && (
                  <div>
                    <label className="text-sm text-gray-500">Notes</label>
                    <p className="mt-1">{request.notes}</p>
                  </div>
                )}
                {request.assignedByUser && (
                  <div>
                    <label className="text-sm text-gray-500">Assigned By</label>
                    <p className="mt-1">
                      {request.assignedByUser.name || request.assignedByUser.email}
                    </p>
                  </div>
                )}
                {request.processedAt && request.processedByUser && (
                  <>
                    <Separator />
                    <div>
                      <label className="text-sm text-gray-500">Processed By</label>
                      <p className="mt-1">
                        {request.processedByUser.name || request.processedByUser.email}
                        <span className="text-gray-400 ml-2">on {formatDateTime(request.processedAt)}</span>
                      </p>
                    </div>
                    {request.processorNotes && (
                      <div>
                        <label className="text-sm text-gray-500">Response Notes</label>
                        <p className="mt-1">{request.processorNotes}</p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* History */}
            {request.history && request.history.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {request.history.map((entry, index) => (
                      <div
                        key={entry.id}
                        className={`flex gap-4 ${index !== request.history.length - 1 ? 'pb-4 border-b' : ''}`}
                      >
                        <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-gray-400"></div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{entry.action}</span>
                            {entry.newStatus && (
                              <AssetRequestStatusBadge status={entry.newStatus} />
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            by {entry.performedBy.name || entry.performedBy.email} on {formatDateTime(entry.createdAt)}
                          </p>
                          {entry.notes && (
                            <p className="text-sm mt-2 text-gray-600">{entry.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
