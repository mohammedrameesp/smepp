import { PrismaClient, Role } from '@prisma/client';
import { sendEmail } from '../../src/lib/email';
import { documentExpiryAlertEmail, adminDocumentExpiryAlertEmail } from '../../src/lib/email-templates';

const prisma = new PrismaClient();

// Days before expiry to send alerts
const EXPIRY_WINDOWS = [30, 14, 7];

interface ExpiringDocument {
  name: string;
  expiryDate: Date;
  daysRemaining: number;
  status: 'expired' | 'expiring';
}

interface UserWithExpiringDocs {
  userId: string;
  userName: string;
  userEmail: string;
  documents: ExpiringDocument[];
}

function getDaysRemaining(date: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiryDate = new Date(date);
  expiryDate.setHours(0, 0, 0, 0);
  const diffTime = expiryDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

async function checkEmployeeDocumentExpiry() {
  console.log('🔍 Checking employee document expiry...');

  // Calculate date ranges for alerts
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const maxWindow = Math.max(...EXPIRY_WINDOWS);
  const alertThreshold = new Date(today);
  alertThreshold.setDate(alertThreshold.getDate() + maxWindow);

  // Get all active organizations for tenant isolation
  const organizations = await prisma.organization.findMany({
    select: { id: true, name: true },
  });

  console.log(`🏢 Processing ${organizations.length} organization(s)`);

  // Process each organization separately (tenant isolation)
  for (const org of organizations) {
    console.log(`\n📁 Processing organization: ${org.name}`);
    await processOrganizationEmployees(org.id, org.name, alertThreshold, maxWindow);
  }
}

async function processOrganizationEmployees(
  orgId: string,
  orgName: string,
  alertThreshold: Date,
  maxWindow: number
) {
  // Find all HR profiles with documents expiring soon or already expired (tenant-scoped)
  const profiles = await prisma.hRProfile.findMany({
    where: {
      tenantId: orgId,
      OR: [
        { qidExpiry: { lte: alertThreshold } },
        { passportExpiry: { lte: alertThreshold } },
        { healthCardExpiry: { lte: alertThreshold } },
        { licenseExpiry: { lte: alertThreshold } },
        { contractExpiry: { lte: alertThreshold } },
      ],
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  console.log(`📋 Found ${profiles.length} profiles with potentially expiring documents`);

  const usersToAlert: UserWithExpiringDocs[] = [];

  for (const profile of profiles) {
    const documents: ExpiringDocument[] = [];

    // Check QID
    if (profile.qidExpiry) {
      const daysRemaining = getDaysRemaining(profile.qidExpiry);
      if (daysRemaining <= maxWindow) {
        documents.push({
          name: 'Qatar ID (QID)',
          expiryDate: profile.qidExpiry,
          daysRemaining,
          status: daysRemaining < 0 ? 'expired' : 'expiring',
        });
      }
    }

    // Check Passport
    if (profile.passportExpiry) {
      const daysRemaining = getDaysRemaining(profile.passportExpiry);
      if (daysRemaining <= maxWindow) {
        documents.push({
          name: 'Passport',
          expiryDate: profile.passportExpiry,
          daysRemaining,
          status: daysRemaining < 0 ? 'expired' : 'expiring',
        });
      }
    }

    // Check Health Card
    if (profile.healthCardExpiry) {
      const daysRemaining = getDaysRemaining(profile.healthCardExpiry);
      if (daysRemaining <= maxWindow) {
        documents.push({
          name: 'Health Card',
          expiryDate: profile.healthCardExpiry,
          daysRemaining,
          status: daysRemaining < 0 ? 'expired' : 'expiring',
        });
      }
    }

    // Check Driving License
    if (profile.hasDrivingLicense && profile.licenseExpiry) {
      const daysRemaining = getDaysRemaining(profile.licenseExpiry);
      if (daysRemaining <= maxWindow) {
        documents.push({
          name: 'Driving License',
          expiryDate: profile.licenseExpiry,
          daysRemaining,
          status: daysRemaining < 0 ? 'expired' : 'expiring',
        });
      }
    }

    // Check Employment Contract / Work Permit
    if (profile.contractExpiry) {
      const daysRemaining = getDaysRemaining(profile.contractExpiry);
      if (daysRemaining <= maxWindow) {
        documents.push({
          name: 'Employment Contract / Work Permit',
          expiryDate: profile.contractExpiry,
          daysRemaining,
          status: daysRemaining < 0 ? 'expired' : 'expiring',
        });
      }
    }

    // Only include if user has documents that should trigger an alert
    // Send on specific days: exactly 30, 14, 7 days before, or if expired
    const shouldAlert = documents.some(
      (doc) =>
        doc.status === 'expired' ||
        EXPIRY_WINDOWS.includes(doc.daysRemaining)
    );

    if (shouldAlert && documents.length > 0 && profile.user) {
      usersToAlert.push({
        userId: profile.user.id,
        userName: profile.user.name || 'Employee',
        userEmail: profile.user.email,
        documents: documents.filter(
          (doc) =>
            doc.status === 'expired' ||
            EXPIRY_WINDOWS.includes(doc.daysRemaining)
        ),
      });
    }
  }

  console.log(`   📧 Sending alerts to ${usersToAlert.length} employees`);

  // Send emails to each user
  let successCount = 0;
  let failCount = 0;

  for (const user of usersToAlert) {
    try {
      const emailContent = documentExpiryAlertEmail({
        userName: user.userName,
        documents: user.documents,
      });

      await sendEmail({
        to: user.userEmail,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });

      console.log(`   ✅ Alert sent to ${user.userEmail} for ${user.documents.length} document(s)`);
      successCount++;
    } catch (error) {
      console.error(`   ❌ Failed to send alert to ${user.userEmail}:`, error);
      failCount++;
    }
  }

  console.log(`   📊 Org Summary:`);
  console.log(`      - Profiles checked: ${profiles.length}`);
  console.log(`      - Alerts sent: ${successCount}`);
  console.log(`      - Alerts failed: ${failCount}`);

  // Send consolidated alert to admins of THIS organization (tenant-scoped)
  await sendAdminConsolidatedAlert(usersToAlert, orgId, orgName);
}

async function sendAdminConsolidatedAlert(usersToAlert: UserWithExpiringDocs[], orgId: string, orgName: string) {
  // Collect all expiring documents for admin summary
  const allDocuments: Array<{
    employeeName: string;
    employeeEmail: string;
    documentName: string;
    expiryDate: Date;
    daysRemaining: number;
    status: 'expired' | 'expiring';
  }> = [];

  for (const user of usersToAlert) {
    for (const doc of user.documents) {
      allDocuments.push({
        employeeName: user.userName,
        employeeEmail: user.userEmail,
        documentName: doc.name,
        expiryDate: doc.expiryDate,
        daysRemaining: doc.daysRemaining,
        status: doc.status,
      });
    }
  }

  if (allDocuments.length === 0) {
    console.log(`   📭 No expiring documents to report to admins for ${orgName}`);
    return;
  }

  // Get admin users for THIS organization only (tenant-scoped)
  const admins = await prisma.user.findMany({
    where: {
      role: Role.ADMIN,
      organizationMemberships: { some: { organizationId: orgId } },
    },
    select: { id: true, email: true, name: true },
  });

  if (admins.length === 0) {
    console.log(`   ⚠️ No admin users found for ${orgName}`);
    return;
  }

  const expiredCount = allDocuments.filter((d) => d.status === 'expired').length;
  const expiringCount = allDocuments.filter((d) => d.status === 'expiring').length;
  const uniqueEmployees = new Set(usersToAlert.map((u) => u.userId)).size;

  console.log(`   📨 Sending consolidated alert to ${admins.length} admin(s) for ${orgName}...`);

  // Send consolidated email to each admin in this organization
  for (const admin of admins) {
    try {
      const emailContent = adminDocumentExpiryAlertEmail({
        documents: allDocuments,
        totalEmployees: uniqueEmployees,
        expiredCount,
        expiringCount,
      });

      await sendEmail({
        to: admin.email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });

      console.log(`   ✅ Consolidated alert sent to admin: ${admin.email}`);
    } catch (error) {
      console.error(`   ❌ Failed to send consolidated alert to admin ${admin.email}:`, error);
    }
  }
}

async function main() {
  try {
    await checkEmployeeDocumentExpiry();
    console.log('\n✅ Employee document expiry check completed');
  } catch (error) {
    console.error('❌ Employee document expiry check failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { checkEmployeeDocumentExpiry };
