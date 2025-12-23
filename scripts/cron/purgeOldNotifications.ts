import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Retention period in days (configurable via env var)
const RETENTION_DAYS = parseInt(process.env.NOTIFICATION_RETENTION_DAYS || '90', 10);

async function purgeOldNotifications() {
  console.log('🔍 Starting notification cleanup...');
  console.log(`📅 Retention period: ${RETENTION_DAYS} days`);

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

  console.log(`📆 Deleting notifications older than: ${cutoffDate.toISOString()}`);

  // Count notifications to be deleted
  const count = await prisma.notification.count({
    where: {
      createdAt: { lt: cutoffDate },
    },
  });

  console.log(`📊 Found ${count} notifications older than ${RETENTION_DAYS} days`);

  if (count === 0) {
    console.log('✅ No notifications to delete');
    return 0;
  }

  // Delete in batches to avoid memory issues
  const BATCH_SIZE = 1000;
  let totalDeleted = 0;

  while (totalDeleted < count) {
    const deleted = await prisma.notification.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });

    totalDeleted += deleted.count;
    console.log(`🗑️ Deleted batch: ${deleted.count} (total: ${totalDeleted}/${count})`);

    if (deleted.count < BATCH_SIZE) {
      break;
    }
  }

  console.log(`\n✅ Cleanup complete: ${totalDeleted} notifications deleted`);
  return totalDeleted;
}

async function main() {
  try {
    await purgeOldNotifications();
  } catch (error) {
    console.error('❌ Notification cleanup failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { purgeOldNotifications };
