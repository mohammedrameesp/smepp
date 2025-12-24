import { PrismaClient, Role } from '@prisma/client';
import { sendEmail } from '../../src/lib/email';
import { companyDocumentExpiryAlertEmail } from '../../src/lib/core/email-templates';

const prisma = new PrismaClient();

// Days before expiry to send alerts
const EXPIRY_WINDOWS = [30, 14, 7];

interface ExpiringDocument {
  documentType: string;
  referenceNumber: string | null;
  expiryDate: Date;
  daysRemaining: number;
  status: 'expired' | 'expiring';
  assetInfo: string | null;
}

function getDaysRemaining(date: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiryDate = new Date(date);
  expiryDate.setHours(0, 0, 0, 0);
  const diffTime = expiryDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

async function checkCompanyDocumentExpiry() {
  console.log('🔍 Checking company document expiry...');

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

  let totalDocuments = 0;
  let totalAlerts = 0;
  let totalSuccess = 0;
  let totalFail = 0;

  // Process each organization separately (tenant isolation)
  for (const org of organizations) {
    console.log(`\n📁 Processing organization: ${org.name}`);

    // Find documents expiring soon or already expired (tenant-scoped)
    const documents = await prisma.companyDocument.findMany({
      where: {
        tenantId: org.id,
        expiryDate: { lte: alertThreshold },
      },
      include: {
        documentType: true,
        asset: {
          select: {
            assetTag: true,
            brand: true,
            model: true,
          },
        },
      },
      orderBy: { expiryDate: 'asc' },
    });

    totalDocuments += documents.length;

    // Filter to only alert on specific days or if expired
    const documentsToAlert: ExpiringDocument[] = [];

    for (const doc of documents) {
      const daysRemaining = getDaysRemaining(doc.expiryDate);
      const isExpired = daysRemaining < 0;
      const shouldAlert = isExpired || EXPIRY_WINDOWS.includes(daysRemaining);

      if (shouldAlert) {
        const assetInfo = doc.asset
          ? `${doc.asset.assetTag || ''} ${doc.asset.brand || ''} ${doc.asset.model || ''}`.trim()
          : null;

        documentsToAlert.push({
          documentType: doc.documentType.name,
          referenceNumber: doc.referenceNumber,
          expiryDate: doc.expiryDate,
          daysRemaining,
          status: isExpired ? 'expired' : 'expiring',
          assetInfo,
        });
      }
    }

    if (documentsToAlert.length === 0) {
      console.log(`   📭 No documents require alerts for ${org.name}`);
      continue;
    }

    totalAlerts += documentsToAlert.length;

    // Get admin users for THIS organization only (tenant-scoped)
    const admins = await prisma.user.findMany({
      where: {
        role: Role.ADMIN,
        organizationMemberships: { some: { organizationId: org.id } },
      },
      select: { id: true, email: true, name: true },
    });

    if (admins.length === 0) {
      console.log(`   ⚠️ No admin users found for ${org.name}`);
      continue;
    }

    const expiredCount = documentsToAlert.filter((d) => d.status === 'expired').length;
    const expiringCount = documentsToAlert.filter((d) => d.status === 'expiring').length;

    console.log(`   📧 Alerting ${admins.length} admin(s) for ${documentsToAlert.length} documents`);

    // Send email to each admin in this organization
    for (const admin of admins) {
      try {
        const emailContent = companyDocumentExpiryAlertEmail({
          documents: documentsToAlert,
          expiredCount,
          expiringCount,
        });

        await sendEmail({
          to: admin.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        });

        console.log(`   ✅ Alert sent to ${admin.email}`);
        totalSuccess++;
      } catch (error) {
        console.error(`   ❌ Failed to send alert to ${admin.email}:`, error);
        totalFail++;
      }
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   - Organizations processed: ${organizations.length}`);
  console.log(`   - Documents checked: ${totalDocuments}`);
  console.log(`   - Documents requiring alerts: ${totalAlerts}`);
  console.log(`   - Alerts sent: ${totalSuccess}`);
  console.log(`   - Alerts failed: ${totalFail}`);
}

async function main() {
  try {
    await checkCompanyDocumentExpiry();
    console.log('\n✅ Company document expiry check completed');
  } catch (error) {
    console.error('❌ Company document expiry check failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { checkCompanyDocumentExpiry };
