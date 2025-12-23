import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

// DELETE MODULE DATA - FOR TESTING ONLY
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { module } = body;

    if (!module) {
      return NextResponse.json({ error: 'Module name required' }, { status: 400 });
    }

    console.log(`🚨 DELETING ALL ${module.toUpperCase()} DATA...`);

    let deletedCount = 0;
    let message = '';

    switch (module) {
      case 'users':
        // Delete auth data first
        await prisma.session.deleteMany({});
        await prisma.account.deleteMany({});
        // Delete users except system accounts
        deletedCount = (await prisma.user.deleteMany({
          where: { isSystemAccount: false },
        })).count;
        message = `Deleted ${deletedCount} users (system accounts preserved)`;
        break;

      case 'assets':
        await prisma.maintenanceRecord.deleteMany({});
        await prisma.assetHistory.deleteMany({});
        deletedCount = (await prisma.asset.deleteMany({})).count;
        message = `Deleted ${deletedCount} assets and all related data`;
        break;

      case 'subscriptions':
        await prisma.subscriptionHistory.deleteMany({});
        deletedCount = (await prisma.subscription.deleteMany({})).count;
        message = `Deleted ${deletedCount} subscriptions and all related data`;
        break;

      case 'suppliers':
        await prisma.supplierEngagement.deleteMany({});
        deletedCount = (await prisma.supplier.deleteMany({})).count;
        message = `Deleted ${deletedCount} suppliers and all related data`;
        break;

      case 'activity':
        deletedCount = (await prisma.activityLog.deleteMany({})).count;
        message = `Deleted ${deletedCount} activity logs`;
        break;

      default:
        return NextResponse.json({ error: 'Invalid module name' }, { status: 400 });
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
