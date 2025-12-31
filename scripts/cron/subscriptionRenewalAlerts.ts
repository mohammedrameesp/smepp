import { PrismaClient, Subscription } from '@prisma/client';
import { sendEmail } from '../../src/lib/email';
import { logAction, ActivityActions } from '../../src/lib/activity';

const prisma = new PrismaClient();

const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',').map(email => email.trim()) || [];
const RENEWAL_WINDOWS = [30, 14, 7]; // Days before renewal

type SubscriptionWithUser = Subscription & {
  assignedUser: {
    name: string | null;
    email: string;
  } | null;
};

async function checkSubscriptionRenewals() {
  console.log('🔍 Checking subscription renewals...');
  
  if (ADMIN_EMAILS.length === 0) {
    console.log('❌ No admin emails configured. Set ADMIN_EMAILS environment variable.');
    return;
  }

  for (const windowDays of RENEWAL_WINDOWS) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + windowDays);
    
    // Find subscriptions expiring on the target date
    const subscriptions = await prisma.subscription.findMany({
      where: {
        renewalDate: {
          gte: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()),
          lt: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1),
        },
        autoRenew: false, // Focus on manual renewals
      },
      include: {
        assignedUser: {
          select: { name: true, email: true },
        },
      },
    });

    if (subscriptions.length > 0) {
      console.log(`📅 Found ${subscriptions.length} subscriptions expiring in ${windowDays} days`);

      // Send email alert
      const emailSubject = `DAMP Alert: ${subscriptions.length} Subscription(s) Expiring in ${windowDays} Days`;
      const emailHtml = generateRenewalEmailHtml(subscriptions, windowDays);

      for (const adminEmail of ADMIN_EMAILS) {
        try {
          await sendEmail({
            to: adminEmail,
            subject: emailSubject,
            html: emailHtml,
          });
          console.log(`✅ Alert sent to ${adminEmail}`);
        } catch (error) {
          console.error(`❌ Failed to send alert to ${adminEmail}:`, error);
        }
      }

      // Log activity per tenant
      const subscriptionsByTenant = subscriptions.reduce((acc, subscription) => {
        if (!acc[subscription.tenantId]) {
          acc[subscription.tenantId] = [];
        }
        acc[subscription.tenantId].push(subscription);
        return acc;
      }, {} as Record<string, typeof subscriptions>);

      for (const [tenantId, tenantSubscriptions] of Object.entries(subscriptionsByTenant)) {
        await logAction(
          tenantId,
          null, // System action
          ActivityActions.ALERT_SUBSCRIPTION_RENEWAL,
          'Subscription',
          undefined,
          {
            windowDays,
            count: tenantSubscriptions.length,
            subscriptions: tenantSubscriptions.map(s => ({
              id: s.id,
              serviceName: s.serviceName,
              renewalDate: s.renewalDate,
            })),
          }
        );
      }
    } else {
      console.log(`✅ No subscriptions expiring in ${windowDays} days`);
    }
  }
}

function generateRenewalEmailHtml(subscriptions: SubscriptionWithUser[], windowDays: number): string {
  const subscriptionsList = subscriptions.map(sub => `
    <tr style="border-bottom: 1px solid #eee;">
      <td style="padding: 8px; font-weight: 500;">${sub.serviceName}</td>
      <td style="padding: 8px;">${sub.assignedUser?.name || sub.assignedUser?.email || 'Unassigned'}</td>
      <td style="padding: 8px;">${sub.renewalDate ? sub.renewalDate.toLocaleDateString() : 'N/A'}</td>
      <td style="padding: 8px;">${sub.costPerCycle ? `$${sub.costPerCycle}` : 'N/A'}</td>
    </tr>
  `).join('');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #1e90ff; margin-bottom: 20px;">DAMP Subscription Renewal Alert</h1>

      <p style="margin-bottom: 20px;">
        <strong>${subscriptions.length}</strong> subscription(s) are set to expire in <strong>${windowDays} days</strong>.
        Please review and take necessary action.
      </p>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background-color: #f8f9fa;">
            <th style="padding: 12px 8px; text-align: left; border-bottom: 2px solid #ddd;">Service</th>
            <th style="padding: 12px 8px; text-align: left; border-bottom: 2px solid #ddd;">Assigned To</th>
            <th style="padding: 12px 8px; text-align: left; border-bottom: 2px solid #ddd;">Renewal Date</th>
            <th style="padding: 12px 8px; text-align: left; border-bottom: 2px solid #ddd;">Cost</th>
          </tr>
        </thead>
        <tbody>
          ${subscriptionsList}
        </tbody>
      </table>

      <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
        This is an automated alert from the DAMP system.
        <br>Generated on ${new Date().toLocaleString()}
      </p>
    </div>
  `;
}

async function main() {
  try {
    await checkSubscriptionRenewals();
    console.log('✅ Subscription renewal check completed');
  } catch (error) {
    console.error('❌ Subscription renewal check failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { checkSubscriptionRenewals };