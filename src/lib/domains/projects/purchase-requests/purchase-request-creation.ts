/**
 * @file purchase-request-creation.ts
 * @description Purchase request creation utilities - item calculations and notifications
 * @module domains/projects/purchase-requests
 *
 * PURPOSE:
 * Provides reusable functions for creating purchase requests.
 * Handles item price calculations, currency conversion, and notification sending.
 *
 * CALCULATION RULES:
 * - ONE_TIME: Full amount added to totalOneTime and totalContractValue
 * - MONTHLY: Amount * duration months (default 12) added to totalContractValue
 * - YEARLY: Full amount added to totalContractValue, monthly = amount/12
 * - USD amounts converted to QAR using USD_TO_QAR_RATE for totals
 */

import { Role } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { USD_TO_QAR_RATE } from '@/lib/constants';
import { sendEmail } from '@/lib/email';
import { purchaseRequestSubmittedEmail } from '@/lib/core/email-templates';
import { createBulkNotifications, createNotification, NotificationTemplates } from '@/lib/domains/system/notifications';
import { findApplicablePolicy, initializeApprovalChain } from '@/lib/domains/system/approvals';
import { notifyApproversViaWhatsApp } from '@/lib/whatsapp';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface PurchaseRequestItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
  currency: string;
  billingCycle: 'ONE_TIME' | 'MONTHLY' | 'YEARLY';
  durationMonths?: number | null;
  amountPerCycle?: number | null;
  productUrl?: string | null;
  category?: string | null;
  supplier?: string | null;
  notes?: string | null;
}

export interface CalculatedItem {
  itemNumber: number;
  description: string;
  quantity: number;
  unitPrice: number;
  currency: string;
  unitPriceQAR: number;
  totalPrice: number;
  totalPriceQAR: number;
  billingCycle: 'ONE_TIME' | 'MONTHLY' | 'YEARLY';
  durationMonths: number | null;
  amountPerCycle: number | null;
  productUrl: string | null;
  category: string | null;
  supplier: string | null;
  notes: string | null;
}

export interface ItemCalculationResult {
  items: CalculatedItem[];
  totalAmount: number;
  totalAmountQAR: number;
  totalOneTime: number;
  totalMonthly: number;
  totalContractValue: number;
}

export interface PurchaseRequestNotificationParams {
  tenantId: string;
  userId: string;
  purchaseRequest: {
    id: string;
    currency: string;
  };
  referenceNumber: string;
  title: string;
  totalAmount: number;
  totalAmountQAR: number;
  itemCount: number;
  priority: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ITEM CALCULATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate totals and QAR conversions for purchase request items
 *
 * @param items - Raw item inputs from the request
 * @param formCurrency - Form-level currency (defaults to first item's currency or 'QAR')
 * @param isSubscriptionType - Whether this is a software subscription purchase
 * @returns Calculated items with totals
 *
 * @example
 * const result = calculatePurchaseRequestItems(items, 'USD', true);
 * // result.totalAmountQAR contains total in QAR
 * // result.items contains items ready for database
 */
export function calculatePurchaseRequestItems(
  items: PurchaseRequestItemInput[],
  formCurrency: string,
  isSubscriptionType: boolean
): ItemCalculationResult {
  let totalAmount = 0;
  let totalAmountQAR = 0;
  let totalOneTime = 0;
  let totalMonthly = 0;
  let totalContractValue = 0;

  const calculatedItems = items.map((item, index) => {
    const billingCycle = (item.billingCycle || 'ONE_TIME') as 'ONE_TIME' | 'MONTHLY' | 'YEARLY';
    const durationMonths = item.durationMonths ?? null;
    const qty = item.quantity || 1;

    // For subscriptions, use amountPerCycle; for others, use unitPrice
    let lineTotal: number;
    let amountPerCycle: number | null = null;
    let unitPriceForDb = item.unitPrice || 0;

    if (isSubscriptionType && item.amountPerCycle && item.amountPerCycle > 0) {
      // Subscription with amountPerCycle provided
      amountPerCycle = item.amountPerCycle;
      lineTotal = amountPerCycle * qty;
      unitPriceForDb = amountPerCycle; // Store amountPerCycle as unitPrice for compatibility
    } else {
      // Non-subscription or legacy handling
      lineTotal = qty * (item.unitPrice || 0);
      if (billingCycle !== 'ONE_TIME') {
        amountPerCycle = lineTotal;
      }
    }

    // Convert to QAR for totals if USD
    const isUSD = item.currency === 'USD' || formCurrency === 'USD';
    const lineTotalQAR = isUSD ? lineTotal * USD_TO_QAR_RATE : lineTotal;
    const unitPriceQAR = isUSD ? unitPriceForDb * USD_TO_QAR_RATE : unitPriceForDb;
    const amountPerCycleQAR = amountPerCycle && isUSD
      ? amountPerCycle * USD_TO_QAR_RATE
      : amountPerCycle;

    // Calculate totals based on billing cycle
    if (billingCycle === 'ONE_TIME') {
      totalOneTime += lineTotalQAR;
      totalAmount += lineTotal;
      totalAmountQAR += lineTotalQAR;
      totalContractValue += lineTotalQAR;
    } else if (billingCycle === 'MONTHLY') {
      totalMonthly += lineTotalQAR;
      const months = durationMonths || 12; // Default to 12 months if not specified
      const contractValue = lineTotalQAR * months;
      totalContractValue += contractValue;
      totalAmount += lineTotal * months;
      totalAmountQAR += contractValue;
    } else if (billingCycle === 'YEARLY') {
      totalMonthly += lineTotalQAR / 12; // Convert to monthly equivalent
      totalContractValue += lineTotalQAR;
      totalAmount += lineTotal;
      totalAmountQAR += lineTotalQAR;
    }

    return {
      itemNumber: index + 1,
      description: item.description,
      quantity: qty,
      unitPrice: unitPriceForDb,
      currency: item.currency || formCurrency,
      unitPriceQAR,
      totalPrice: lineTotal,
      totalPriceQAR: lineTotalQAR,
      billingCycle,
      durationMonths,
      amountPerCycle: amountPerCycleQAR,
      productUrl: item.productUrl || null,
      category: item.category || null,
      supplier: item.supplier || null,
      notes: item.notes || null,
    };
  });

  return {
    items: calculatedItems,
    totalAmount,
    totalAmountQAR,
    totalOneTime,
    totalMonthly,
    totalContractValue,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Send notifications for a newly created purchase request
 * Checks for approval policy and notifies appropriate approvers
 *
 * @param params - Notification parameters
 *
 * @example
 * await sendPurchaseRequestNotifications({
 *   tenantId: 'org_123',
 *   userId: 'user_456',
 *   purchaseRequest: { id: 'pr_789', currency: 'QAR' },
 *   referenceNumber: 'PR-00001',
 *   title: 'Office Supplies',
 *   totalAmount: 500,
 *   totalAmountQAR: 500,
 *   itemCount: 3,
 *   priority: 'MEDIUM',
 * });
 */
export async function sendPurchaseRequestNotifications(
  params: PurchaseRequestNotificationParams
): Promise<void> {
  const {
    tenantId,
    userId,
    purchaseRequest,
    referenceNumber,
    title,
    totalAmount,
    totalAmountQAR,
    itemCount,
    priority,
  } = params;

  // Get org slug and user info for notifications
  const [org, currentUser] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: tenantId },
      select: { slug: true, name: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    }),
  ]);
  const orgSlug = org?.slug || 'app';
  const orgName = org?.name || 'Organization';
  const userName = currentUser?.name || currentUser?.email || 'User';

  // Check for multi-level approval policy
  const approvalPolicy = await findApplicablePolicy('PURCHASE_REQUEST', { amount: totalAmountQAR, tenantId });

  if (approvalPolicy && approvalPolicy.levels.length > 0) {
    // Initialize approval chain
    const steps = await initializeApprovalChain('PURCHASE_REQUEST', purchaseRequest.id, approvalPolicy, tenantId);

    // Send WhatsApp notifications to approvers (non-blocking)
    if (steps.length > 0) {
      notifyApproversViaWhatsApp(
        tenantId,
        'PURCHASE_REQUEST',
        purchaseRequest.id,
        steps[0].requiredRole
      );
    }

    // Notify users with the first level's required role
    const firstStep = steps[0];
    if (firstStep) {
      const approvers = await prisma.user.findMany({
        where: {
          role: firstStep.requiredRole,
          organizationMemberships: { some: { organizationId: tenantId } },
        },
        select: { id: true, email: true },
      });

      // Send email to approvers
      if (approvers.length > 0) {
        const emailContent = purchaseRequestSubmittedEmail({
          referenceNumber,
          requesterName: userName,
          title,
          totalAmount: Number(totalAmount),
          currency: purchaseRequest.currency,
          itemCount,
          priority,
          orgSlug,
          orgName,
        });

        await sendEmail({
          to: approvers.map(a => a.email),
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        });
      }

      // In-app notifications
      for (const approver of approvers) {
        await createNotification({
          recipientId: approver.id,
          type: 'APPROVAL_PENDING',
          title: 'Purchase Request Approval Required',
          message: `${userName} submitted a purchase request (${referenceNumber}) for ${purchaseRequest.currency} ${totalAmount.toFixed(2)}. Your approval is required.`,
          link: `/admin/purchase-requests/${purchaseRequest.id}`,
          entityType: 'PurchaseRequest',
          entityId: purchaseRequest.id,
        }, tenantId);
      }
    }
  } else {
    // No policy - fall back to notifying all admins
    const admins = await prisma.user.findMany({
      where: {
        role: Role.ADMIN,
        organizationMemberships: { some: { organizationId: tenantId } },
      },
      select: { id: true, email: true },
    });

    if (admins.length > 0) {
      // Email notification
      const emailContent = purchaseRequestSubmittedEmail({
        referenceNumber,
        requesterName: userName,
        title,
        totalAmount: Number(totalAmount),
        currency: purchaseRequest.currency,
        itemCount,
        priority,
        orgSlug,
        orgName,
      });

      await sendEmail({
        to: admins.map(a => a.email),
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });

      // In-app notifications
      const notifications = admins.map(admin =>
        NotificationTemplates.purchaseRequestSubmitted(
          admin.id,
          referenceNumber,
          userName,
          title,
          purchaseRequest.id
        )
      );
      await createBulkNotifications(notifications, tenantId);
    }
  }
}
