import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/**
 * ONE-TIME SCRIPT: Sync dates with purchase dates
 * - Sets createdAt to purchaseDate for all assets and subscriptions
 * - Sets assignment dates in history to purchaseDate
 */
export async function POST(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = {
      assetsUpdated: 0,
      assetsSkipped: 0,
      assetHistoryUpdated: 0,
      subscriptionsUpdated: 0,
      subscriptionsSkipped: 0,
      subscriptionHistoryUpdated: 0,
      errors: [] as string[],
    };

    // Get all assets with purchase dates
    const assets = await prisma.asset.findMany({
      where: {
        purchaseDate: { not: null },
      },
      orderBy: {
        purchaseDate: 'asc',
      },
      select: {
        id: true,
        assetTag: true,
        model: true,
        purchaseDate: true,
        createdAt: true,
      },
    });

    console.log(`Found ${assets.length} assets with purchase dates`);

    // Update each asset's createdAt to match purchaseDate
    for (const asset of assets) {
      try {
        if (!asset.purchaseDate) continue;

        // Update asset createdAt
        await prisma.asset.update({
          where: { id: asset.id },
          data: {
            createdAt: asset.purchaseDate,
          },
        });

        results.assetsUpdated++;
        console.log(`Updated asset ${asset.assetTag || asset.model}: createdAt set to ${asset.purchaseDate.toISOString().split('T')[0]}`);

        // Update all assignment history records for this asset
        const historyRecords = await prisma.assetHistory.findMany({
          where: {
            assetId: asset.id,
            action: 'ASSIGNED',
          },
        });

        for (const history of historyRecords) {
          await prisma.assetHistory.update({
            where: { id: history.id },
            data: {
              assignmentDate: asset.purchaseDate,
              createdAt: asset.purchaseDate,
            },
          });
          results.assetHistoryUpdated++;
        }

      } catch (error) {
        results.assetsSkipped++;
        results.errors.push(`Failed to update asset ${asset.assetTag || asset.model}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        console.error(`Error updating asset ${asset.id}:`, error);
      }
    }

    // Count assets without purchase dates
    const assetsWithoutPurchaseDate = await prisma.asset.findMany({
      where: {
        purchaseDate: null,
      },
      select: {
        id: true,
        assetTag: true,
        model: true,
      },
    });

    console.log(`Found ${assetsWithoutPurchaseDate.length} assets without purchase dates`);

    // Set old date for assets without purchase dates (so they appear last when sorted)
    const veryOldDate = new Date('1900-01-01');
    for (const asset of assetsWithoutPurchaseDate) {
      try {
        await prisma.asset.update({
          where: { id: asset.id },
          data: {
            createdAt: veryOldDate,
          },
        });
        console.log(`Set old date for asset without purchase date: ${asset.assetTag || asset.model}`);
      } catch (error) {
        console.error(`Error setting old date for asset ${asset.id}:`, error);
      }
    }

    // ========== SUBSCRIPTIONS ==========

    // Get all subscriptions with purchase dates
    const subscriptions = await prisma.subscription.findMany({
      where: {
        purchaseDate: { not: null },
      },
      orderBy: {
        purchaseDate: 'asc',
      },
      select: {
        id: true,
        serviceName: true,
        purchaseDate: true,
        createdAt: true,
      },
    });

    console.log(`Found ${subscriptions.length} subscriptions with purchase dates`);

    // Update each subscription's createdAt to match purchaseDate
    for (const subscription of subscriptions) {
      try {
        if (!subscription.purchaseDate) continue;

        // Update subscription createdAt
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            createdAt: subscription.purchaseDate,
          },
        });

        results.subscriptionsUpdated++;
        console.log(`Updated subscription ${subscription.serviceName}: createdAt set to ${subscription.purchaseDate.toISOString().split('T')[0]}`);

        // Update all assignment history records for this subscription
        const historyRecords = await prisma.subscriptionHistory.findMany({
          where: {
            subscriptionId: subscription.id,
            OR: [
              { action: 'CREATED' },
              { action: 'REASSIGNED' },
            ],
          },
        });

        for (const history of historyRecords) {
          await prisma.subscriptionHistory.update({
            where: { id: history.id },
            data: {
              assignmentDate: subscription.purchaseDate,
              createdAt: subscription.purchaseDate,
            },
          });
          results.subscriptionHistoryUpdated++;
        }

      } catch (error) {
        results.subscriptionsSkipped++;
        results.errors.push(`Failed to update subscription ${subscription.serviceName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        console.error(`Error updating subscription ${subscription.id}:`, error);
      }
    }

    // Count subscriptions without purchase dates
    const subscriptionsWithoutPurchaseDate = await prisma.subscription.findMany({
      where: {
        purchaseDate: null,
      },
      select: {
        id: true,
        serviceName: true,
      },
    });

    console.log(`Found ${subscriptionsWithoutPurchaseDate.length} subscriptions without purchase dates`);

    // Set old date for subscriptions without purchase dates (so they appear last when sorted)
    for (const subscription of subscriptionsWithoutPurchaseDate) {
      try {
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            createdAt: veryOldDate,
          },
        });
        console.log(`Set old date for subscription without purchase date: ${subscription.serviceName}`);
      } catch (error) {
        console.error(`Error setting old date for subscription ${subscription.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Dates synchronized successfully',
      results: {
        assets: {
          total: assets.length,
          updated: results.assetsUpdated,
          skipped: results.assetsSkipped,
          historyUpdated: results.assetHistoryUpdated,
          withoutPurchaseDate: assetsWithoutPurchaseDate.length,
        },
        subscriptions: {
          total: subscriptions.length,
          updated: results.subscriptionsUpdated,
          skipped: results.subscriptionsSkipped,
          historyUpdated: results.subscriptionHistoryUpdated,
          withoutPurchaseDate: subscriptionsWithoutPurchaseDate.length,
        },
        errors: results.errors,
      },
    });

  } catch (error) {
    console.error('Asset date sync error:', error);
    return NextResponse.json(
      {
        error: 'Failed to sync asset dates',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
