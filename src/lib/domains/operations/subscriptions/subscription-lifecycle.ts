import { prisma } from '@/lib/prisma';
import { BillingCycle } from '@prisma/client';

export interface ActivePeriod {
  startDate: Date;
  endDate: Date | null; // null if currently active
  renewalDate: Date;
  months: number;
  cost: number;
}

export interface CostBreakdown {
  totalCost: number;
  currency: string;
  billingCycle: string;
  activePeriods: ActivePeriod[];
}

/**
 * Reactivate a cancelled subscription with a new renewal date
 * @param reactivationDate - The actual date of reactivation (defaults to now)
 */
export async function reactivateSubscription(
  subscriptionId: string,
  newRenewalDate: Date,
  notes?: string,
  performedBy?: string,
  reactivationDate?: Date
) {
  // Use transaction to prevent race conditions
  return await prisma.$transaction(async (tx) => {
    const subscription = await tx.subscription.findUnique({
      where: { id: subscriptionId }
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    if (subscription.status === 'ACTIVE') {
      throw new Error('Subscription is already active');
    }

    if (subscription.status !== 'CANCELLED') {
      throw new Error('Can only reactivate CANCELLED subscriptions');
    }

    const actualReactivationDate = reactivationDate || new Date();

    // Update subscription
    const updated = await tx.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'ACTIVE',
        renewalDate: newRenewalDate,
        reactivatedAt: actualReactivationDate,
        // Keep lastActiveRenewalDate for historical reference
      }
    });

    // Create history entry
    await tx.subscriptionHistory.create({
      data: {
        subscriptionId,
        action: 'REACTIVATED',
        oldStatus: subscription.status,
        newStatus: 'ACTIVE',
        oldRenewalDate: subscription.renewalDate,
        newRenewalDate: newRenewalDate,
        reactivationDate: actualReactivationDate,
        notes,
        performedBy,
      }
    });

    return updated;
  });
}

/**
 * Cancel a subscription (can be reactivated later if needed)
 * @param cancellationDate - The date when the subscription was/will be cancelled (defaults to now)
 */
export async function cancelSubscription(
  subscriptionId: string,
  cancellationDate: Date,
  notes?: string,
  performedBy?: string
) {
  // Use transaction to prevent race conditions
  return await prisma.$transaction(async (tx) => {
    const subscription = await tx.subscription.findUnique({
      where: { id: subscriptionId }
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    if (subscription.status === 'CANCELLED') {
      throw new Error('Subscription is already cancelled');
    }

    if (subscription.status !== 'ACTIVE') {
      throw new Error('Can only cancel ACTIVE subscriptions');
    }

    const actualCancellationDate = cancellationDate || new Date();

    // Update subscription
    const updated = await tx.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'CANCELLED',
        lastActiveRenewalDate: subscription.renewalDate,
        cancelledAt: actualCancellationDate,
      }
    });

    // Create history entry
    await tx.subscriptionHistory.create({
      data: {
        subscriptionId,
        action: 'CANCELLED',
        oldStatus: 'ACTIVE',
        newStatus: 'CANCELLED',
        oldRenewalDate: subscription.renewalDate,
        notes,
        performedBy,
      }
    });

    return updated;
  });
}

/**
 * Get all active periods for a subscription
 *
 * Billing Rules:
 * 1. When activated/reactivated: Charge immediately for full billing cycle
 * 2. When cancelled: If cancelled AFTER renewal date, charge for full billing cycle
 */
export async function getActivePeriods(subscriptionId: string): Promise<ActivePeriod[]> {
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: {
      history: {
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  if (!subscription) {
    throw new Error('Subscription not found');
  }

  const periods: ActivePeriod[] = [];
  let currentPeriodStart: Date | null = subscription.purchaseDate || subscription.createdAt;
  let currentRenewalDate = subscription.purchaseDate || subscription.createdAt;
  const costPerCycle = subscription.costPerCycle ? Number(subscription.costPerCycle) : 0;

  // Track charged cycles to avoid double-charging
  let lastChargedRenewalDate = new Date(currentPeriodStart);

  for (const historyEntry of subscription.history) {
    if (historyEntry.action === 'CANCELLED') {
      // End current active period
      if (currentPeriodStart) {
        // Use the actual cancellation date from the subscription, not when the history was created
        const endDate = subscription.cancelledAt || historyEntry.createdAt;
        const oldRenewalDate = historyEntry.oldRenewalDate || currentRenewalDate;

        // Calculate how many full billing cycles to charge
        const cycles = calculateBillingCycles(
          lastChargedRenewalDate,
          endDate,
          new Date(oldRenewalDate),
          subscription.billingCycle
        );

        const cost = cycles * costPerCycle;
        const months = subscription.billingCycle === 'MONTHLY' ? cycles : cycles * 12;

        periods.push({
          startDate: currentPeriodStart,
          endDate: endDate,
          renewalDate: oldRenewalDate,
          months,
          cost
        });

        // Update last charged renewal date
        lastChargedRenewalDate = addBillingCycles(lastChargedRenewalDate, cycles, subscription.billingCycle);
        currentPeriodStart = null;
      }
    } else if (historyEntry.action === 'REACTIVATED') {
      // Start new active period - charge immediately for full cycle
      currentPeriodStart = historyEntry.reactivationDate || historyEntry.createdAt;
      currentRenewalDate = historyEntry.newRenewalDate || currentRenewalDate;
      lastChargedRenewalDate = new Date(currentPeriodStart);
    }
  }

  // If currently active, calculate cost up to now
  if (subscription.status === 'ACTIVE' && currentPeriodStart) {
    const endDate = new Date();
    const renewalDate = subscription.renewalDate || currentRenewalDate;

    // Calculate how many full billing cycles to charge
    const cycles = calculateBillingCycles(
      lastChargedRenewalDate,
      endDate,
      new Date(renewalDate),
      subscription.billingCycle
    );

    const cost = cycles * costPerCycle;
    const months = subscription.billingCycle === 'MONTHLY' ? cycles : cycles * 12;

    periods.push({
      startDate: currentPeriodStart,
      endDate: null,
      renewalDate: renewalDate,
      months,
      cost
    });
  }

  return periods;
}

/**
 * Get active periods for a specific user's assignment to a subscription
 * Only counts time when the subscription was assigned to this user
 */
export async function getUserActivePeriods(subscriptionId: string, userId: string): Promise<ActivePeriod[]> {
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: {
      history: {
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  if (!subscription) {
    throw new Error('Subscription not found');
  }

  const periods: ActivePeriod[] = [];
  const costPerCycle = subscription.costPerCycle ? Number(subscription.costPerCycle) : 0;

  // Track assignment periods for this user
  let userAssignedAt: Date | null = null;
  let currentRenewalDate = subscription.purchaseDate || subscription.createdAt;
  let lastChargedRenewalDate: Date | null = null;

  // Check if subscription was initially assigned to this user
  const initialAssignment = subscription.history.find(h => h.action === 'REASSIGNED' && h.newUserId === userId);

  if (!initialAssignment && subscription.assignedUserId === userId) {
    // User is currently assigned and there's no reassignment history - they've had it from the start
    userAssignedAt = subscription.purchaseDate || subscription.createdAt;
    lastChargedRenewalDate = new Date(userAssignedAt);
  }

  // Process history to find when user had the subscription
  for (const historyEntry of subscription.history) {
    if (historyEntry.action === 'REASSIGNED') {
      // User is being assigned
      if (historyEntry.newUserId === userId) {
        userAssignedAt = historyEntry.assignmentDate || historyEntry.createdAt;
        lastChargedRenewalDate = new Date(userAssignedAt);

        if (historyEntry.newRenewalDate) {
          currentRenewalDate = historyEntry.newRenewalDate;
        }
      }
      // User is being unassigned
      else if (historyEntry.oldUserId === userId && userAssignedAt) {
        const endDate = historyEntry.createdAt;
        const renewalDate = historyEntry.oldRenewalDate || currentRenewalDate;

        // Calculate billing for this assignment period
        // If lastChargedRenewalDate is null, fall back to when user was assigned
        const chargeStartDate = lastChargedRenewalDate || userAssignedAt;
        const cycles = calculateBillingCycles(
          chargeStartDate,
          endDate,
          new Date(renewalDate),
          subscription.billingCycle
        );

        const cost = cycles * costPerCycle;
        const months = subscription.billingCycle === 'MONTHLY' ? cycles : cycles * 12;

        periods.push({
          startDate: userAssignedAt,
          endDate: endDate,
          renewalDate: renewalDate,
          months,
          cost
        });

        userAssignedAt = null;
        lastChargedRenewalDate = null;
      }
    }
    // Subscription was cancelled while user had it
    else if (historyEntry.action === 'CANCELLED' && userAssignedAt && subscription.assignedUserId === userId) {
      // Use the actual cancellation date from the subscription, not when the history was created
      const endDate = subscription.cancelledAt || historyEntry.createdAt;
      const renewalDate = historyEntry.oldRenewalDate || currentRenewalDate;

      // If lastChargedRenewalDate is null, fall back to when user was assigned
      const chargeStartDate = lastChargedRenewalDate || userAssignedAt;
      const cycles = calculateBillingCycles(
        chargeStartDate,
        endDate,
        new Date(renewalDate),
        subscription.billingCycle
      );

      const cost = cycles * costPerCycle;
      const months = subscription.billingCycle === 'MONTHLY' ? cycles : cycles * 12;

      periods.push({
        startDate: userAssignedAt,
        endDate: endDate,
        renewalDate: renewalDate,
        months,
        cost
      });

      userAssignedAt = null;
      lastChargedRenewalDate = null;
    }
    // Subscription was reactivated while user had it
    else if (historyEntry.action === 'REACTIVATED' && userAssignedAt && subscription.assignedUserId === userId) {
      // Continue the period but update renewal date
      if (historyEntry.newRenewalDate) {
        currentRenewalDate = historyEntry.newRenewalDate;
      }
    }
  }

  // If user currently has the subscription assigned and it's active
  if (userAssignedAt && subscription.assignedUserId === userId && subscription.status === 'ACTIVE') {
    const endDate = new Date();
    const renewalDate = subscription.renewalDate || currentRenewalDate;

    // If lastChargedRenewalDate is null, fall back to when user was assigned
    const chargeStartDate = lastChargedRenewalDate || userAssignedAt;
    const cycles = calculateBillingCycles(
      chargeStartDate,
      endDate,
      new Date(renewalDate),
      subscription.billingCycle
    );

    const cost = cycles * costPerCycle;
    const months = subscription.billingCycle === 'MONTHLY' ? cycles : cycles * 12;

    periods.push({
      startDate: userAssignedAt,
      endDate: null,
      renewalDate: renewalDate,
      months,
      cost
    });
  }

  return periods;
}

/**
 * Calculate total cost for a subscription based on active periods only
 */
export async function calculateTotalCost(subscriptionId: string): Promise<CostBreakdown> {
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId }
  });

  if (!subscription) {
    throw new Error('Subscription not found');
  }

  const periods = await getActivePeriods(subscriptionId);
  const totalCost = periods.reduce((sum, period) => sum + period.cost, 0);

  return {
    totalCost,
    currency: subscription.costCurrency || 'QAR',
    billingCycle: subscription.billingCycle,
    activePeriods: periods
  };
}

/**
 * Calculate number of billing cycles to charge
 *
 * Rules:
 * 1. ONE_TIME subscriptions are only charged once on first activation
 * 2. Recurring subscriptions charge 1 cycle immediately upon activation/reactivation
 * 3. Additional cycles are charged for each renewal date that has passed
 *
 * @param lastChargedDate - When the subscription started or was last charged
 * @param endDate - When the period ended (pause/cancel date, or current date)
 * @param renewalDate - The next scheduled renewal date
 * @param billingCycle - MONTHLY, YEARLY, or ONE_TIME
 * @returns Number of full billing cycles to charge
 */
function calculateBillingCycles(
  lastChargedDate: Date,
  endDate: Date,
  renewalDate: Date,
  billingCycle: BillingCycle
): number {
  if (billingCycle === 'ONE_TIME') {
    // ONE_TIME subscriptions should only be charged once, on first activation
    return 1;
  }

  // Start with 1 cycle (charged immediately upon activation)
  let cycles = 1;
  const currentRenewal = new Date(renewalDate);

  // Add additional cycles for each renewal period that has passed
  while (endDate >= currentRenewal) {
    cycles++;

    // Move to next renewal date
    if (billingCycle === 'MONTHLY') {
      currentRenewal.setMonth(currentRenewal.getMonth() + 1);
    } else if (billingCycle === 'YEARLY') {
      currentRenewal.setFullYear(currentRenewal.getFullYear() + 1);
    } else {
      // For other billing cycles, break to avoid infinite loop
      break;
    }
  }

  return cycles;
}

/**
 * Add billing cycles to a date
 */
function addBillingCycles(date: Date, cycles: number, billingCycle: BillingCycle): Date {
  const newDate = new Date(date);

  if (billingCycle === 'MONTHLY') {
    newDate.setMonth(newDate.getMonth() + cycles);
  } else if (billingCycle === 'YEARLY') {
    newDate.setFullYear(newDate.getFullYear() + cycles);
  }

  return newDate;
}

/**
 * Calculate next renewal date based on billing cycle
 */
export function calculateNextRenewalDate(
  startDate: Date,
  billingCycle: BillingCycle
): Date {
  const date = new Date(startDate);

  if (billingCycle === 'MONTHLY') {
    date.setMonth(date.getMonth() + 1);
  } else if (billingCycle === 'YEARLY') {
    date.setFullYear(date.getFullYear() + 1);
  }

  return date;
}

/**
 * Get all subscriptions for a user (including inactive ones) with their current status and active periods
 */
export async function getUserSubscriptionHistory(userId: string) {
  const subscriptions = await prisma.subscription.findMany({
    where: { assignedUserId: userId },
    include: {
      history: {
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const subscriptionsWithPeriods = await Promise.all(
    subscriptions.map(async (subscription) => {
      // Get user-specific periods (only when THIS user had the subscription)
      const activePeriods = await getUserActivePeriods(subscription.id, userId);
      const totalCost = activePeriods.reduce((sum, period) => sum + period.cost, 0);
      const totalMonths = activePeriods.reduce((sum, period) => sum + period.months, 0);

      return {
        id: subscription.id,
        serviceName: subscription.serviceName,
        category: subscription.category,
        accountId: subscription.accountId,
        purchaseDate: subscription.purchaseDate,
        renewalDate: subscription.renewalDate,
        billingCycle: subscription.billingCycle,
        costPerCycle: subscription.costPerCycle ? Number(subscription.costPerCycle) : null,
        costCurrency: subscription.costCurrency,
        costQAR: subscription.costQAR ? Number(subscription.costQAR) : null,
        vendor: subscription.vendor,
        status: subscription.status,
        assignedUserId: subscription.assignedUserId,
        autoRenew: subscription.autoRenew,
        paymentMethod: subscription.paymentMethod,
        notes: subscription.notes,
        lastActiveRenewalDate: subscription.lastActiveRenewalDate,
        cancelledAt: subscription.cancelledAt,
        reactivatedAt: subscription.reactivatedAt,
        createdAt: subscription.createdAt,
        updatedAt: subscription.updatedAt,
        history: subscription.history,
        activePeriods,
        totalCost,
        totalMonths,
        currentPeriod: activePeriods.find(p => p.endDate === null),
      };
    })
  );

  return subscriptionsWithPeriods;
}
