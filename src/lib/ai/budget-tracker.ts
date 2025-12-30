/**
 * AI Budget Tracker with Alert Notifications
 *
 * Tracks AI usage and sends notifications when thresholds are reached.
 */

import { prisma } from '@/lib/core/prisma';
import { SubscriptionTier } from '@prisma/client';
import { getLimitsForTier } from './rate-limiter';

// Usage thresholds for notifications (percentage)
const ALERT_THRESHOLDS = [75, 90, 100] as const;
type AlertThreshold = typeof ALERT_THRESHOLDS[number];

// Key for tracking last alert sent per org/threshold
function getAlertKey(tenantId: string, threshold: AlertThreshold, period: 'daily' | 'monthly'): string {
  const now = new Date();
  const periodKey = period === 'daily'
    ? `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}`
    : `${now.getUTCFullYear()}-${now.getUTCMonth()}`;
  return `ai_budget_alert:${tenantId}:${period}:${threshold}:${periodKey}`;
}

/**
 * Get the start of the current month (UTC)
 */
function getStartOfMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

interface BudgetStatus {
  monthlyTokensUsed: number;
  monthlyTokenLimit: number;
  percentUsed: number;
  isOverBudget: boolean;
  nextThreshold: AlertThreshold | null;
}

/**
 * Check current budget status for an organization
 */
export async function getBudgetStatus(
  tenantId: string,
  tier: SubscriptionTier
): Promise<BudgetStatus> {
  const limits = getLimitsForTier(tier);
  const monthStart = getStartOfMonth();

  // Get monthly usage
  const monthlyUsage = await prisma.aIChatUsage.aggregate({
    where: {
      tenantId,
      createdAt: { gte: monthStart },
    },
    _sum: { totalTokens: true },
  });

  // Get organization's custom budget if set
  const org = await prisma.organization.findUnique({
    where: { id: tenantId },
    select: { aiTokenBudgetMonthly: true },
  });

  const monthlyTokensUsed = monthlyUsage._sum.totalTokens || 0;
  const monthlyTokenLimit = org?.aiTokenBudgetMonthly || limits.monthlyTokens;
  const percentUsed = Math.round((monthlyTokensUsed / monthlyTokenLimit) * 100);

  // Find next threshold
  let nextThreshold: AlertThreshold | null = null;
  for (const threshold of ALERT_THRESHOLDS) {
    if (percentUsed < threshold) {
      nextThreshold = threshold;
      break;
    }
  }

  return {
    monthlyTokensUsed,
    monthlyTokenLimit,
    percentUsed,
    isOverBudget: percentUsed >= 100,
    nextThreshold,
  };
}

/**
 * Check if an alert has already been sent for this threshold/period
 */
async function hasAlertBeenSent(tenantId: string, threshold: AlertThreshold): Promise<boolean> {
  const key = getAlertKey(tenantId, threshold, 'monthly');

  const existing = await prisma.systemSettings.findFirst({
    where: {
      tenantId,
      key,
    },
  });

  return !!existing;
}

/**
 * Mark an alert as sent for this threshold/period
 */
async function markAlertSent(tenantId: string, threshold: AlertThreshold): Promise<void> {
  const key = getAlertKey(tenantId, threshold, 'monthly');

  await prisma.systemSettings.upsert({
    where: {
      tenantId_key: { tenantId, key },
    },
    create: {
      tenantId,
      key,
      value: new Date().toISOString(),
    },
    update: {
      value: new Date().toISOString(),
    },
  });
}

/**
 * Check budget and send alerts if thresholds are crossed
 * Returns the current budget status and any new alerts sent
 */
export async function checkBudgetAndNotify(
  tenantId: string,
  tier: SubscriptionTier
): Promise<{ status: BudgetStatus; alertsSent: AlertThreshold[] }> {
  const status = await getBudgetStatus(tenantId, tier);
  const alertsSent: AlertThreshold[] = [];

  // Check each threshold
  for (const threshold of ALERT_THRESHOLDS) {
    if (status.percentUsed >= threshold) {
      const alreadySent = await hasAlertBeenSent(tenantId, threshold);

      if (!alreadySent) {
        await sendBudgetAlert(tenantId, threshold, status);
        await markAlertSent(tenantId, threshold);
        alertsSent.push(threshold);
      }
    }
  }

  return { status, alertsSent };
}

/**
 * Send budget alert notification
 */
async function sendBudgetAlert(
  tenantId: string,
  threshold: AlertThreshold,
  status: BudgetStatus
): Promise<void> {
  // Get organization admins to notify
  const admins = await prisma.organizationUser.findMany({
    where: {
      organizationId: tenantId,
      role: { in: ['OWNER', 'ADMIN'] },
    },
    select: {
      userId: true,
    },
  });

  const org = await prisma.organization.findUnique({
    where: { id: tenantId },
    select: { name: true },
  });

  // Create notification message based on threshold
  let title: string;
  let message: string;

  if (threshold === 100) {
    title = 'AI Budget Exceeded';
    message = `Your organization "${org?.name}" has reached 100% of its monthly AI token budget (${status.monthlyTokensUsed.toLocaleString()} / ${status.monthlyTokenLimit.toLocaleString()} tokens). AI chat has been limited until next month.`;
  } else if (threshold === 90) {
    title = 'AI Budget Warning - 90%';
    message = `Your organization "${org?.name}" has used 90% of its monthly AI token budget (${status.monthlyTokensUsed.toLocaleString()} / ${status.monthlyTokenLimit.toLocaleString()} tokens).`;
  } else {
    title = 'AI Budget Notice - 75%';
    message = `Your organization "${org?.name}" has used 75% of its monthly AI token budget (${status.monthlyTokensUsed.toLocaleString()} / ${status.monthlyTokenLimit.toLocaleString()} tokens).`;
  }

  // Create in-app notifications for admins
  // Insert notifications (fire and forget)
  try {
    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          recipientId: admin.userId,
          tenantId,
          title,
          message,
          type: 'GENERAL', // Use GENERAL type for budget alerts
          link: '/admin/settings/ai-usage',
        },
      });
    }
  } catch (error) {
    console.error('[AI Budget] Failed to create notifications:', error);
  }

  // Log the alert
  console.log(
    `[AI Budget] Alert sent for org ${tenantId}: ${threshold}% threshold reached ` +
    `(${status.monthlyTokensUsed}/${status.monthlyTokenLimit} tokens)`
  );
}

/**
 * Update token usage after a chat response
 * Called after processChat completes
 */
export async function trackTokenUsage(
  tenantId: string,
  tier: SubscriptionTier,
  tokensUsed: number
): Promise<void> {
  // The token usage is already tracked in AIConversation.totalTokens
  // This function just checks if we need to send any alerts

  if (tokensUsed > 0) {
    // Check budget and send alerts if needed
    await checkBudgetAndNotify(tenantId, tier);
  }
}

/**
 * Get usage summary for display
 */
export async function getUsageSummary(
  tenantId: string,
  tier: SubscriptionTier
): Promise<{
  status: BudgetStatus;
  progressColor: 'green' | 'yellow' | 'red';
  statusText: string;
}> {
  const status = await getBudgetStatus(tenantId, tier);

  let progressColor: 'green' | 'yellow' | 'red';
  let statusText: string;

  if (status.percentUsed >= 100) {
    progressColor = 'red';
    statusText = 'Budget exceeded - AI chat limited';
  } else if (status.percentUsed >= 90) {
    progressColor = 'red';
    statusText = 'Critical - Consider upgrading';
  } else if (status.percentUsed >= 75) {
    progressColor = 'yellow';
    statusText = 'Approaching limit';
  } else {
    progressColor = 'green';
    statusText = 'Normal usage';
  }

  return { status, progressColor, statusText };
}

/**
 * Reset budget alerts at the start of a new month
 * Can be called from a cron job
 */
export async function resetMonthlyAlerts(tenantId: string): Promise<void> {
  // Delete all monthly alert keys for this tenant
  await prisma.systemSettings.deleteMany({
    where: {
      tenantId,
      key: { startsWith: 'ai_budget_alert:' },
    },
  });
}
