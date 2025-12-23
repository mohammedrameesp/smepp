import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { Role } from '@prisma/client';

// DELETE ALL DATA - FOR TESTING ONLY
export async function DELETE(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🚨 DELETING ALL DATA FROM DATABASE...');

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
      sessions: 0,
      accounts: 0,
      users: 0,
    };

    // Delete Asset data
    deletedCounts.maintenanceRecords = (await prisma.maintenanceRecord.deleteMany({})).count;
    deletedCounts.assetHistory = (await prisma.assetHistory.deleteMany({})).count;
    deletedCounts.assets = (await prisma.asset.deleteMany({})).count;

    // Delete Subscription data
    deletedCounts.subscriptionHistory = (await prisma.subscriptionHistory.deleteMany({})).count;
    deletedCounts.subscriptions = (await prisma.subscription.deleteMany({})).count;

    // Delete Supplier data
    deletedCounts.supplierEngagements = (await prisma.supplierEngagement.deleteMany({})).count;
    deletedCounts.suppliers = (await prisma.supplier.deleteMany({})).count;

    // Delete Activity logs
    deletedCounts.activityLogs = (await prisma.activityLog.deleteMany({})).count;

    // Delete Auth data
    deletedCounts.sessions = (await prisma.session.deleteMany({})).count;
    deletedCounts.accounts = (await prisma.account.deleteMany({})).count;

    // Delete Users (except system accounts)
    deletedCounts.users = (await prisma.user.deleteMany({
      where: {
        isSystemAccount: false,
      },
    })).count;

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
