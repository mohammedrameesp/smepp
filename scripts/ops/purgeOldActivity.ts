import { PrismaClient } from '@prisma/client';
import logger from '../../src/lib/log';

const prisma = new PrismaClient();

const RETENTION_DAYS = parseInt(process.env.ACTIVITY_RETENTION_DAYS || '365');

async function purgeOldActivityLogs() {
  logger.info(`🗑️ Starting activity log purge (retention: ${RETENTION_DAYS} days)`);
  
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);
    
    // Count records to be deleted
    const countToDelete = await prisma.activityLog.count({
      where: {
        at: {
          lt: cutoffDate,
        },
      },
    });
    
    if (countToDelete === 0) {
      logger.info('✅ No old activity logs to purge');
      return;
    }
    
    logger.info(`📊 Found ${countToDelete} activity logs older than ${cutoffDate.toISOString()}`);
    
    // Delete old records in batches to avoid timeout
    const BATCH_SIZE = 1000;
    let totalDeleted = 0;
    
    while (totalDeleted < countToDelete) {
      // Get batch of IDs to delete
      const idsToDelete = await prisma.activityLog.findMany({
        where: {
          at: {
            lt: cutoffDate,
          },
        },
        select: { id: true },
        take: BATCH_SIZE,
      });

      if (idsToDelete.length === 0) break;

      const result = await prisma.activityLog.deleteMany({
        where: {
          id: {
            in: idsToDelete.map(item => item.id),
          },
        },
      });
      
      totalDeleted += result.count;
      logger.info(`🗑️ Deleted ${result.count} records (${totalDeleted}/${countToDelete})`);
      
      if (result.count === 0) break; // No more records to delete
    }
    
    logger.info(`✅ Activity log purge completed. Deleted ${totalDeleted} records.`);
    
    // Log this action as an activity (meta!)
    await prisma.activityLog.create({
      data: {
        action: 'ACTIVITY_LOG_PURGED',
        payload: {
          retentionDays: RETENTION_DAYS,
          cutoffDate: cutoffDate.toISOString(),
          recordsDeleted: totalDeleted,
        },
      },
    });
    
  } catch (error) {
    logger.error({ error }, '❌ Activity log purge failed');
    throw error;
  }
}

async function main() {
  try {
    await purgeOldActivityLogs();
  } catch (error) {
    logger.error({ error }, 'Purge operation failed');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { purgeOldActivityLogs };