import { PrismaClient, Asset } from '@prisma/client';
import { sendEmail } from '../../src/lib/email';
import { logAction, ActivityActions } from '../../src/lib/activity';

const prisma = new PrismaClient();

const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',').map(email => email.trim()) || [];
const WARRANTY_WINDOWS = [60, 30]; // Days before warranty expiry

type AssetWithUser = Asset & {
  assignedUser: {
    name: string | null;
    email: string;
  } | null;
};

async function checkWarrantyExpirations() {
  console.log('🔍 Checking warranty expirations...');
  
  if (ADMIN_EMAILS.length === 0) {
    console.log('❌ No admin emails configured. Set ADMIN_EMAILS environment variable.');
    return;
  }

  for (const windowDays of WARRANTY_WINDOWS) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + windowDays);
    
    // Find assets with warranty expiring on the target date
    const assets = await prisma.asset.findMany({
      where: {
        warrantyExpiry: {
          gte: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()),
          lt: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1),
        },
        status: {
          not: 'DISPOSED', // Don't alert for disposed assets
        },
      },
      include: {
        assignedUser: {
          select: { name: true, email: true },
        },
      },
    });

    if (assets.length > 0) {
      console.log(`⚠️ Found ${assets.length} assets with warranty expiring in ${windowDays} days`);

      // Send email alert
      const emailSubject = `DAMP Alert: ${assets.length} Asset Warranty(ies) Expiring in ${windowDays} Days`;
      const emailHtml = generateWarrantyEmailHtml(assets, windowDays);

      for (const adminEmail of ADMIN_EMAILS) {
        try {
          await sendEmail({
            to: adminEmail,
            subject: emailSubject,
            html: emailHtml,
          });
          console.log(`✅ Warranty alert sent to ${adminEmail}`);
        } catch (error) {
          console.error(`❌ Failed to send warranty alert to ${adminEmail}:`, error);
        }
      }

      // Log activity
      await logAction(
        null, // System action
        ActivityActions.ALERT_WARRANTY_EXPIRY,
        'Asset',
        undefined,
        {
          windowDays,
          count: assets.length,
          assets: assets.map(a => ({
            id: a.id,
            assetTag: a.assetTag,
            model: a.model,
            type: a.type,
            warrantyExpiry: a.warrantyExpiry,
          })),
        }
      );
    } else {
      console.log(`✅ No warranties expiring in ${windowDays} days`);
    }
  }
}

function generateWarrantyEmailHtml(assets: AssetWithUser[], windowDays: number): string {
  const assetsList = assets.map(asset => `
    <tr style="border-bottom: 1px solid #eee;">
      <td style="padding: 8px; font-weight: 500;">${asset.assetTag || asset.model}</td>
      <td style="padding: 8px;">${asset.type}</td>
      <td style="padding: 8px;">${asset.serial || 'N/A'}</td>
      <td style="padding: 8px;">${asset.assignedUser?.name || asset.assignedUser?.email || 'Unassigned'}</td>
      <td style="padding: 8px;">${asset.warrantyExpiry ? asset.warrantyExpiry.toLocaleDateString() : 'N/A'}</td>
      <td style="padding: 8px;">
        <span style="padding: 2px 6px; background-color: ${getStatusColor(asset.status)}; color: white; border-radius: 3px; font-size: 11px;">
          ${asset.status.replace('_', ' ')}
        </span>
      </td>
    </tr>
  `).join('');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #1e90ff; margin-bottom: 20px;">DAMP Warranty Expiration Alert</h1>

      <p style="margin-bottom: 20px;">
        <strong>${assets.length}</strong> asset warranty(ies) are set to expire in <strong>${windowDays} days</strong>.
        Please review and consider warranty renewal or replacement planning.
      </p>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
        <thead>
          <tr style="background-color: #f8f9fa;">
            <th style="padding: 12px 8px; text-align: left; border-bottom: 2px solid #ddd;">Asset</th>
            <th style="padding: 12px 8px; text-align: left; border-bottom: 2px solid #ddd;">Type</th>
            <th style="padding: 12px 8px; text-align: left; border-bottom: 2px solid #ddd;">Serial</th>
            <th style="padding: 12px 8px; text-align: left; border-bottom: 2px solid #ddd;">Assigned To</th>
            <th style="padding: 12px 8px; text-align: left; border-bottom: 2px solid #ddd;">Warranty Expiry</th>
            <th style="padding: 12px 8px; text-align: left; border-bottom: 2px solid #ddd;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${assetsList}
        </tbody>
      </table>

      <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
        This is an automated alert from the DAMP system.
        <br>Generated on ${new Date().toLocaleString()}
      </p>
    </div>
  `;
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'IN_USE': return '#22c55e';
    case 'SPARE': return '#3b82f6';
    case 'REPAIR': return '#f59e0b';
    case 'DISPOSED': return '#ef4444';
    default: return '#6b7280';
  }
}

async function main() {
  try {
    await checkWarrantyExpirations();
    console.log('✅ Warranty expiration check completed');
  } catch (error) {
    console.error('❌ Warranty expiration check failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { checkWarrantyExpirations };