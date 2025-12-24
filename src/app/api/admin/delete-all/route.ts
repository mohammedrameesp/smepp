import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { Role } from '@prisma/client';

// DELETE ALL DATA FOR CURRENT ORGANIZATION ONLY
export async function DELETE(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Require organization context for tenant isolation
    const tenantId = session.user.organizationId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    console.log(`🚨 DELETING ALL DATA FOR ORGANIZATION: ${tenantId}...`);

    // Delete in order to respect foreign key constraints
    const deletedCounts = {
      maintenanceRecords: 0,
      assetHistory: 0,
      assets: 0,
      subscriptionHistory: 0,
      subscriptions: 0,
      supplierEngagements: 0,
      suppliers: 0,
      activityLogs: 0,
    };

    // Delete Asset data (tenant-scoped)
    deletedCounts.maintenanceRecords = (await prisma.maintenanceRecord.deleteMany({ where: { tenantId } })).count;
    const orgAssets = await prisma.asset.findMany({ where: { tenantId }, select: { id: true } });
    const assetIds = orgAssets.map(a => a.id);
    deletedCounts.assetHistory = (await prisma.assetHistory.deleteMany({ where: { assetId: { in: assetIds } } })).count;
    deletedCounts.assets = (await prisma.asset.deleteMany({ where: { tenantId } })).count;

    // Delete Subscription data (tenant-scoped)
    const orgSubs = await prisma.subscription.findMany({ where: { tenantId }, select: { id: true } });
    const subIds = orgSubs.map(s => s.id);
    deletedCounts.subscriptionHistory = (await prisma.subscriptionHistory.deleteMany({ where: { subscriptionId: { in: subIds } } })).count;
    deletedCounts.subscriptions = (await prisma.subscription.deleteMany({ where: { tenantId } })).count;

    // Delete Supplier data (tenant-scoped)
    deletedCounts.supplierEngagements = (await prisma.supplierEngagement.deleteMany({ where: { tenantId } })).count;
    deletedCounts.suppliers = (await prisma.supplier.deleteMany({ where: { tenantId } })).count;

    // Delete Activity logs (tenant-scoped)
    deletedCounts.activityLogs = (await prisma.activityLog.deleteMany({ where: { tenantId } })).count;

    console.log('✅ ALL DATA DELETED:', deletedCounts);

    return NextResponse.json({
      message: 'All data deleted successfully',
      deletedCounts,
    });
  } catch (error) {
    console.error('Delete all error:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
