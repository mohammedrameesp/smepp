import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { Role } from '@prisma/client';

// DELETE MODULE DATA FOR CURRENT ORGANIZATION ONLY
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { module } = body;

    if (!module) {
      return NextResponse.json({ error: 'Module name required' }, { status: 400 });
    }

    console.log(`🚨 DELETING ALL ${module.toUpperCase()} DATA FOR ORGANIZATION: ${tenantId}...`);

    let deletedCount = 0;
    let message = '';

    switch (module) {
      case 'assets':
        await prisma.maintenanceRecord.deleteMany({ where: { tenantId } });
        const orgAssets = await prisma.asset.findMany({ where: { tenantId }, select: { id: true } });
        const assetIds = orgAssets.map(a => a.id);
        await prisma.assetHistory.deleteMany({ where: { assetId: { in: assetIds } } });
        deletedCount = (await prisma.asset.deleteMany({ where: { tenantId } })).count;
        message = `Deleted ${deletedCount} assets and all related data`;
        break;

      case 'subscriptions':
        const orgSubs = await prisma.subscription.findMany({ where: { tenantId }, select: { id: true } });
        const subIds = orgSubs.map(s => s.id);
        await prisma.subscriptionHistory.deleteMany({ where: { subscriptionId: { in: subIds } } });
        deletedCount = (await prisma.subscription.deleteMany({ where: { tenantId } })).count;
        message = `Deleted ${deletedCount} subscriptions and all related data`;
        break;

      case 'suppliers':
        await prisma.supplierEngagement.deleteMany({ where: { tenantId } });
        deletedCount = (await prisma.supplier.deleteMany({ where: { tenantId } })).count;
        message = `Deleted ${deletedCount} suppliers and all related data`;
        break;

      case 'activity':
        deletedCount = (await prisma.activityLog.deleteMany({ where: { tenantId } })).count;
        message = `Deleted ${deletedCount} activity logs`;
        break;

      default:
        return NextResponse.json({ error: 'Invalid module name. Valid: assets, subscriptions, suppliers, activity' }, { status: 400 });
    }

    console.log(`✅ ${message}`);

    return NextResponse.json({
      message,
      deletedCount,
    });
  } catch (error) {
    console.error('Delete module error:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete module data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
