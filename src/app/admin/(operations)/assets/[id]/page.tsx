import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { redirect, notFound } from 'next/navigation';
import { Role, AssetRequestStatus } from '@prisma/client';
import Link from 'next/link';
import AssetHistory from '@/components/AssetHistory';
import { formatDate, formatDateTime } from '@/lib/date-format';
import { AssetCostBreakdown } from '@/components/assets/asset-cost-breakdown';
import { CloneAssetButton } from '@/components/assets/clone-asset-button';
import { DeleteAssetButton } from '@/components/assets/delete-asset-button';
import { AssetMaintenanceRecords } from '@/components/assets/asset-maintenance-records';
import { AssetAssignDialog } from '@/components/domains/operations/asset-requests';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AssetDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  if (process.env.NODE_ENV !== 'development' && session.user.role !== Role.ADMIN) {
    redirect('/forbidden');
  }

  const { id } = await params;

  const asset = await prisma.asset.findUnique({
    where: { id },
    include: {
      assignedUser: {
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
  if (asset.assignedUserId) {
    const mostRecentAssignment = await prisma.assetHistory.findFirst({
      where: {
        assetId: id,
        action: 'ASSIGNED',
        toUserId: asset.assignedUserId,
      },
      orderBy: { createdAt: 'desc' },
      select: { assignmentDate: true },
    });
    assignmentDate = mostRecentAssignment?.assignmentDate || null;
  }

  // Check if admin can assign this asset
  const hasPendingRequest = asset.assetRequests.length > 0;
  const canAssign = asset.status === 'SPARE' && !hasPendingRequest;

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Asset Details</h1>
                <p className="text-gray-600">
                  Complete information for {asset.model}
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {canAssign && (
                  <AssetAssignDialog asset={asset} />
                )}
                <Link href={`/admin/assets/${asset.id}/edit`}>
                  <Button>Edit Asset</Button>
                </Link>
                <CloneAssetButton assetId={asset.id} assetModel={asset.model} />
                <DeleteAssetButton assetId={asset.id} assetModel={asset.model} />
                <Link href="/admin/assets">
                  <Button variant="outline">Back to Assets</Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Pending Requests Alert */}
          {hasPendingRequest && (
            <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-medium text-yellow-800">Pending Requests</h3>
              <div className="mt-2 space-y-1">
                {asset.assetRequests.map((req) => (
                  <p key={req.id} className="text-sm text-yellow-700">
                    <Link href={`/admin/asset-requests/${req.id}`} className="underline hover:text-yellow-900">
                      {req.requestNumber}
                    </Link>
                    {' - '}
                    {req.status.replace(/_/g, ' ')}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-6">
            {/* Acquisition Type */}
            <Card>
              <CardHeader>
                <CardTitle>Acquisition Information</CardTitle>
                <CardDescription>
                  How this asset was acquired
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label>Acquisition Type</Label>
                    <div>
                      <Badge variant={asset.acquisitionType === 'NEW_PURCHASE' ? 'default' : 'secondary'}>
                        {asset.acquisitionType === 'NEW_PURCHASE' ? 'New Purchase' : 'Transferred'}
                      </Badge>
                    </div>
                  </div>
                  {asset.acquisitionType === 'TRANSFERRED' && asset.transferNotes && (
                    <div>
                      <Label>Transfer Notes</Label>
                      <div className="whitespace-pre-wrap">{asset.transferNotes}</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

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
                    <div className="whitespace-pre-wrap mt-2">{asset.configuration}</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Financial & Procurement Information */}
            <Card>
              <CardHeader>
                <CardTitle>Financial & Procurement</CardTitle>
                <CardDescription>
                  Purchase details, costs, and supplier information
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
                    <div>
                      <Label>Supplier/Vendor</Label>
                      <div>{asset.supplier || 'Not specified'}</div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <Label>Invoice/PO Number</Label>
                      <div className="font-mono">{asset.invoiceNumber || 'Not provided'}</div>
                    </div>
                    <div>
                      <Label>Cost/Value</Label>
                      <div className="text-lg font-semibold">
                        {asset.price ? (
                          <div>
                            {asset.priceCurrency === 'USD' ? '$' : 'QAR '}{Number(asset.price).toFixed(2)}
                            {asset.priceCurrency === 'USD' && asset.priceQAR && (
                              <div className="text-sm text-gray-600 font-normal mt-1">
                                ≈ QAR {Number(asset.priceQAR).toFixed(2)} (saved at time of entry)
                              </div>
                            )}
                            {asset.priceCurrency === 'QAR' && asset.price && (
                              <div className="text-sm text-gray-600 font-normal mt-1">
                                ≈ USD {(Number(asset.price) / 3.64).toFixed(2)}
                              </div>
                            )}
                          </div>
                        ) : 'Not specified'}
                      </div>
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
                Current user assignment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Assigned To (User)</Label>
                  <div>
                    {asset.assignedUser ? (
                      <div>
                        <div className="font-medium">
                          {asset.assignedUser.name || 'Unknown User'}
                        </div>
                        <div className="text-sm text-gray-600">
                          {asset.assignedUser.email}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400">Unassigned</span>
                    )}
                  </div>
                </div>
                {asset.assignedUser && assignmentDate && (
                  <div>
                    <Label>Assignment Date</Label>
                    <div className="font-medium">
                      {formatDate(assignmentDate)}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          {asset.location && (
            <Card>
              <CardHeader>
                <CardTitle>Location</CardTitle>
                <CardDescription>
                  Physical location of this asset
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div>{asset.location}</div>
              </CardContent>
            </Card>
          )}

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
                <div className="whitespace-pre-wrap">{asset.notes}</div>
              </CardContent>
            </Card>
          )}

          {/* Asset Utilization Stats */}
          <AssetCostBreakdown
            assetId={asset.id}
            purchaseDate={asset.purchaseDate}
          />

          {/* Maintenance Records */}
          <AssetMaintenanceRecords assetId={asset.id} readOnly={true} />

          {/* Asset History */}
          <AssetHistory assetId={asset.id} />

          {/* System Information - Moved to bottom */}
          <Card>
            <CardHeader>
              <CardTitle>System Information</CardTitle>
              <CardDescription>
                System timestamps and tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label>Created</Label>
                  <div>{formatDateTime(asset.createdAt)}</div>
                </div>
                <div>
                  <Label>Last Updated</Label>
                  <div>{formatDateTime(asset.updatedAt)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    </div>
  );
}