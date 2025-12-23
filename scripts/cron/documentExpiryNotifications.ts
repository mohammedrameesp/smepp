import { PrismaClient } from '@prisma/client';
import { createNotification, NotificationTemplates } from '../../src/lib/domains/system/notifications';

const prisma = new PrismaClient();

// Days before expiry to send in-app notifications
const EXPIRY_WINDOWS = [30, 14, 7, 1];

function getDaysRemaining(date: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiryDate = new Date(date);
  expiryDate.setHours(0, 0, 0, 0);
  const diffTime = expiryDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

interface DocumentCheck {
  name: string;
  expiryDate: Date | null;
}

async function createDocumentExpiryNotifications() {
  console.log('🔍 Checking for document expiry notifications...');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const maxWindow = Math.max(...EXPIRY_WINDOWS);
  const alertThreshold = new Date(today);
  alertThreshold.setDate(alertThreshold.getDate() + maxWindow);

  // Find all HR profiles with documents expiring soon
  const profiles = await prisma.hRProfile.findMany({
    where: {
      OR: [
        { qidExpiry: { lte: alertThreshold, gt: today } },
        { passportExpiry: { lte: alertThreshold, gt: today } },
        { healthCardExpiry: { lte: alertThreshold, gt: today } },
        { licenseExpiry: { lte: alertThreshold, gt: today } },
        { contractExpiry: { lte: alertThreshold, gt: today } },
      ],
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  console.log(`📋 Found ${profiles.length} profiles with potentially expiring documents`);

  let notificationCount = 0;

  for (const profile of profiles) {
    if (!profile.user) continue;

    const documentsToCheck: DocumentCheck[] = [
      { name: 'Qatar ID (QID)', expiryDate: profile.qidExpiry },
      { name: 'Passport', expiryDate: profile.passportExpiry },
      { name: 'Health Card', expiryDate: profile.healthCardExpiry },
      { name: 'Driving License', expiryDate: profile.hasDrivingLicense ? profile.licenseExpiry : null },
      { name: 'Employment Contract', expiryDate: profile.contractExpiry },
    ];

    for (const doc of documentsToCheck) {
      if (!doc.expiryDate) continue;

      const daysRemaining = getDaysRemaining(doc.expiryDate);

      // Only notify on specific days
      if (!EXPIRY_WINDOWS.includes(daysRemaining)) continue;

      // Check if notification already sent today for this document
      const existingNotification = await prisma.notification.findFirst({
        where: {
          recipientId: profile.user.id,
          type: 'DOCUMENT_EXPIRY_WARNING',
          message: { contains: doc.name },
          createdAt: {
            gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
          },
        },
      });

      if (existingNotification) {
        continue; // Already notified today
      }

      // Create notification
      await createNotification(
        NotificationTemplates.documentExpiryWarning(
          profile.user.id,
          doc.name,
          daysRemaining
        )
      );

      console.log(`📬 Notification created for ${profile.user.name}: ${doc.name} expires in ${daysRemaining} days`);
      notificationCount++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   - Profiles checked: ${profiles.length}`);
  console.log(`   - Notifications created: ${notificationCount}`);
}

async function main() {
  try {
    await createDocumentExpiryNotifications();
    console.log('\n✅ Document expiry notification check completed');
  } catch (error) {
    console.error('❌ Document expiry notification check failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { createDocumentExpiryNotifications };
