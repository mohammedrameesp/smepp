import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { AssetRequestStatus } from '@prisma/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { formatDate, formatDateTime } from '@/lib/date-format';
import { AssetMaintenanceRecords } from '@/components/domains/operations/assets/asset-maintenance-records';
import { AssetRequestDialog, AssetReturnDialog } from '@/components/domains/operations/asset-requests';

interface Props {
  params: Promise<{ id: string }>;
}

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

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'IN_USE':
        return 'default';
      case 'SPARE':
        return 'secondary';
      case 'REPAIR':
        return 'destructive';
      case 'DISPOSED':
        return 'outline';
      default:
        return 'secondary';
    }
  };

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

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Asset Details</h1>
              <p className="text-gray-600">
                {asset.model}
                {isAssignedToMe && (
                  <Badge variant="outline" className="ml-3 bg-blue-50 text-blue-700 border-blue-200">
                    Assigned to you
                  </Badge>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              {canRequest && (
                <AssetRequestDialog asset={asset} />
              )}
              {canReturn && (
                <AssetReturnDialog asset={asset} />
              )}
              <Link href="/employee/assets">
                <Button variant="outline">Back to All Assets</Button>
              </Link>
              {isAssignedToMe && (
                <Link href="/employee/my-assets">
                  <Button variant="outline">Back to My Assets</Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Pending Request Alert */}
        {myPendingRequest && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h3 className="font-medium text-yellow-800">
                  {myPendingRequest.status === 'PENDING_USER_ACCEPTANCE'
                    ? 'This asset has been assigned to you'
                    : myPendingRequest.status === 'PENDING_ADMIN_APPROVAL'
                    ? 'Your request for this asset is pending approval'
                    : 'Your return request is pending approval'}
                </h3>
                <p className="text-sm text-yellow-700 mt-1">
                  <Link href={`/employee/asset-requests/${myPendingRequest.id}`} className="underline hover:text-yellow-900">
                    View request details
                  </Link>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Show if someone else has a pending request */}
        {hasPendingRequest && !myPendingRequest && asset.status === 'SPARE' && (
          <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">
              This asset has a pending request from another user.
            </p>
          </div>
        )}

        <div className="grid gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Core asset details and identification
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label>Asset ID/Tag</Label>
                    <div className="font-mono text-lg font-semibold">
                      {asset.assetTag || 'Not assigned'}
                    </div>
                  </div>
                  <div>
                    <Label>Asset Type</Label>
                    <div className="text-lg font-semibold">{asset.type}</div>
                  </div>
                  <div>
                    <Label>Category/Department</Label>
                    <div>{asset.category || 'Not specified'}</div>
                  </div>
                  <div>
                    <Label>Brand/Manufacturer</Label>
                    <div>{asset.brand || 'Not specified'}</div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label>Model/Version</Label>
                    <div className="text-lg font-semibold">{asset.model}</div>
                  </div>
                  <div>
                    <Label>Serial Number</Label>
                    <div className="font-mono">{asset.serial || 'Not provided'}</div>
                  </div>
                  <div>
                    <Label>Status/Condition</Label>
                    <div>
                      <Badge variant={getStatusBadgeVariant(asset.status)}>
                        {asset.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
              {asset.configuration && (
                <div className="mt-6 pt-6 border-t">
                  <Label>Configuration/Specs</Label>
                  <div className="text-gray-700 whitespace-pre-wrap mt-2">{asset.configuration}</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Financial & Procurement Information */}
          <Card>
            <CardHeader>
              <CardTitle>Procurement Information</CardTitle>
              <CardDescription>
                Purchase details and supplier information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label>Purchase Date</Label>
                    <div>
                      {formatDate(asset.purchaseDate, 'Not specified')}
                    </div>
                  </div>
                  <div>
                    <Label>Warranty Expiry</Label>
                    <div>
                      {asset.warrantyExpiry ? (
                        <div className="flex items-center gap-2">
                          <span>{formatDate(asset.warrantyExpiry)}</span>
                          {asset.warrantyExpiry < new Date() && (
                            <Badge variant="destructive">Expired</Badge>
                          )}
                        </div>
                      ) : (
                        'Not specified'
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label>Supplier/Vendor</Label>
                    <div>{asset.supplier || 'Not specified'}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assignment Information */}
          <Card>
            <CardHeader>
              <CardTitle>Assignment</CardTitle>
              <CardDescription>
                Current user and project assignments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label>Assigned To (User)</Label>
                  <div>
                    {asset.assignedMember ? (
                      <div>
                        <div className="font-medium">
                          {asset.assignedMember.name || 'Unknown User'}
                          {isAssignedToMe && (
                            <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700 border-blue-200">
                              You
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-600">
                          {asset.assignedMember.email}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-500">Unassigned</span>
                    )}
                  </div>
                </div>
                <div>
                  <Label>Location</Label>
                  <div>
                    {asset.location?.name || <span className="text-gray-500">Not specified</span>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes / Remarks */}
          {asset.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes / Remarks</CardTitle>
                <CardDescription>
                  Additional information about this asset
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-gray-700 whitespace-pre-wrap">{asset.notes}</div>
              </CardContent>
            </Card>
          )}

          {/* Maintenance Records */}
          <AssetMaintenanceRecords assetId={asset.id} readOnly={true} />
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-sm font-medium text-gray-700 mb-1">{children}</div>;
}
