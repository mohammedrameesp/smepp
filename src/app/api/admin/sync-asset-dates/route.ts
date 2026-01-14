import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import logger from '@/lib/core/log';

/**
 * ONE-TIME SCRIPT: Sync dates with purchase dates
 * - Sets createdAt to purchaseDate for all assets and subscriptions
 * - Sets assignment dates in history to purchaseDate
 *
 * SECURITY: All queries are filtered by tenantId to ensure tenant isolation
 */
export async function POST(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // SECURITY: Get tenant ID from session - required for data isolation
    const tenantId = session.user.organizationId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 });
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

    // Get all assets with purchase dates (filtered by tenant)
    const assets = await prisma.asset.findMany({
      where: {
        tenantId,
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

    logger.info({ count: assets.length }, 'Found assets with purchase dates');

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
        logger.debug({ assetTag: asset.assetTag, model: asset.model, purchaseDate: asset.purchaseDate.toISOString().split('T')[0] }, 'Updated asset createdAt');

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
        logger.error({ assetId: asset.id, error: error instanceof Error ? error.message : String(error) }, 'Error updating asset');
      }
    }

    // Count assets without purchase dates (filtered by tenant)
    const assetsWithoutPurchaseDate = await prisma.asset.findMany({
      where: {
        tenantId,
        purchaseDate: null,
      },
      select: {
        id: true,
        assetTag: true,
        model: true,
      },
    });

    logger.info({ count: assetsWithoutPurchaseDate.length }, 'Found assets without purchase dates');

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
        logger.debug({ assetTag: asset.assetTag, model: asset.model }, 'Set old date for asset without purchase date');
      } catch (error) {
        logger.error({ assetId: asset.id, error: error instanceof Error ? error.message : String(error) }, 'Error setting old date for asset');
      }
    }

    // ========== SUBSCRIPTIONS ==========

    // Get all subscriptions with purchase dates (filtered by tenant)
    const subscriptions = await prisma.subscription.findMany({
      where: {
        tenantId,
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

    logger.info({ count: subscriptions.length }, 'Found subscriptions with purchase dates');

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
        logger.debug({ serviceName: subscription.serviceName, purchaseDate: subscription.purchaseDate.toISOString().split('T')[0] }, 'Updated subscription createdAt');

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
        logger.error({ subscriptionId: subscription.id, error: error instanceof Error ? error.message : String(error) }, 'Error updating subscription');
      }
    }

    // Count subscriptions without purchase dates (filtered by tenant)
    const subscriptionsWithoutPurchaseDate = await prisma.subscription.findMany({
      where: {
        tenantId,
        purchaseDate: null,
      },
      select: {
        id: true,
        serviceName: true,
      },
    });

    logger.info({ count: subscriptionsWithoutPurchaseDate.length }, 'Found subscriptions without purchase dates');

    // Set old date for subscriptions without purchase dates (so they appear last when sorted)
    for (const subscription of subscriptionsWithoutPurchaseDate) {
      try {
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            createdAt: veryOldDate,
          },
        });
        logger.debug({ serviceName: subscription.serviceName }, 'Set old date for subscription without purchase date');
      } catch (error) {
        logger.error({ subscriptionId: subscription.id, error: error instanceof Error ? error.message : String(error) }, 'Error setting old date for subscription');
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
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Asset date sync error');
    return NextResponse.json(
      {
        error: 'Failed to sync asset dates',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
