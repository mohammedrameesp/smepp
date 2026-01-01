/**
 * @file route.ts
 * @description Subscription bulk export to Excel endpoint
 * @module operations/subscriptions
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { arrayToCSV, formatDateForCSV, formatCurrencyForCSV } from '@/lib/csv-utils';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

async function exportSubscriptionsHandler(_request: NextRequest, context: APIContext) {
  const { tenant } = context;
  const tenantId = tenant!.tenantId;

  // Fetch subscriptions for current tenant only with related data including history
  const subscriptions = await prisma.subscription.findMany({
    where: { tenantId },
    include: {
      assignedMember: {
        select: { name: true, email: true },
      },
      history: {
        include: {
          performedBy: {
            select: { name: true, email: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

    // Transform data for CSV - Main subscriptions sheet
    const csvData = subscriptions.map(sub => ({
      id: sub.id,
      serviceName: sub.serviceName,
      category: sub.category || '',
      accountId: sub.accountId || '',
      vendor: sub.vendor || '',
      purchaseDate: formatDateForCSV(sub.purchaseDate),
      renewalDate: formatDateForCSV(sub.renewalDate),
      billingCycle: sub.billingCycle,
      costPerCycle: formatCurrencyForCSV(sub.costPerCycle ? Number(sub.costPerCycle) : null),
      costCurrency: sub.costCurrency || 'QAR',
      costQAR: formatCurrencyForCSV(sub.costQAR ? Number(sub.costQAR) : null),
      status: sub.status,
      autoRenew: sub.autoRenew ? 'Yes' : 'No',
      paymentMethod: sub.paymentMethod || '',
      notes: sub.notes || '',
      assignedMemberId: sub.assignedMemberId || '',
      assignedMemberName: sub.assignedMember?.name || '',
      assignedMemberEmail: sub.assignedMember?.email || '',
      cancelledAt: formatDateForCSV(sub.cancelledAt),
      reactivatedAt: formatDateForCSV(sub.reactivatedAt),
      lastActiveRenewalDate: formatDateForCSV(sub.lastActiveRenewalDate),
      createdAt: formatDateForCSV(sub.createdAt),
      updatedAt: formatDateForCSV(sub.updatedAt),
    }));

    // Transform subscription history for separate sheet
    const historyData: any[] = [];
    try {
      subscriptions.forEach(sub => {
        if (sub.history && Array.isArray(sub.history)) {
          sub.history.forEach(h => {
            historyData.push({
              subscriptionId: sub.id,
              subscriptionName: sub.serviceName,
              action: h.action,
              oldStatus: h.oldStatus || '',
              newStatus: h.newStatus || '',
              oldRenewalDate: formatDateForCSV(h.oldRenewalDate),
              newRenewalDate: formatDateForCSV(h.newRenewalDate),
              assignmentDate: formatDateForCSV(h.assignmentDate),
              reactivationDate: formatDateForCSV(h.reactivationDate),
              notes: h.notes || '',
              performedBy: h.performedBy?.name || h.performedBy?.email || 'System',
              createdAt: formatDateForCSV(h.createdAt),
            });
          });
        }
      });
    } catch {
      // Continue without history if there's an error
    }

    // Define CSV headers for subscriptions
    const headers = [
      { key: 'id', header: 'ID' },
      { key: 'serviceName', header: 'Service Name' },
      { key: 'category', header: 'Category' },
      { key: 'accountId', header: 'Account ID/Email' },
      { key: 'vendor', header: 'Vendor' },
      { key: 'purchaseDate', header: 'Purchase Date (dd/mm/yyyy)' },
      { key: 'renewalDate', header: 'Renewal Date (dd/mm/yyyy)' },
      { key: 'billingCycle', header: 'Billing Cycle' },
      { key: 'costPerCycle', header: 'Cost Per Cycle' },
      { key: 'costCurrency', header: 'Cost Currency' },
      { key: 'costQAR', header: 'Cost (QAR)' },
      { key: 'status', header: 'Status' },
      { key: 'autoRenew', header: 'Auto Renew' },
      { key: 'paymentMethod', header: 'Payment Method' },
      { key: 'notes', header: 'Notes' },
      { key: 'assignedMemberId', header: 'Assigned Member ID' },
      { key: 'assignedMemberName', header: 'Assigned Member Name' },
      { key: 'assignedMemberEmail', header: 'Assigned Member Email' },
      { key: 'cancelledAt', header: 'Cancelled At (dd/mm/yyyy)' },
      { key: 'reactivatedAt', header: 'Reactivated At (dd/mm/yyyy)' },
      { key: 'lastActiveRenewalDate', header: 'Last Active Renewal Date (dd/mm/yyyy)' },
      { key: 'createdAt', header: 'Created At (dd/mm/yyyy)' },
      { key: 'updatedAt', header: 'Updated At (dd/mm/yyyy)' },
    ];

    // Define headers for history sheet
    const historyHeaders: { key: string; header: string }[] = [
      { key: 'subscriptionId', header: 'Subscription ID' },
      { key: 'subscriptionName', header: 'Subscription Name' },
      { key: 'action', header: 'Action' },
      { key: 'oldStatus', header: 'Old Status' },
      { key: 'newStatus', header: 'New Status' },
      { key: 'oldRenewalDate', header: 'Old Renewal Date (dd/mm/yyyy)' },
      { key: 'newRenewalDate', header: 'New Renewal Date (dd/mm/yyyy)' },
      { key: 'assignmentDate', header: 'Assignment Date (dd/mm/yyyy)' },
      { key: 'reactivationDate', header: 'Reactivation Date (dd/mm/yyyy)' },
      { key: 'notes', header: 'Notes' },
      { key: 'performedBy', header: 'Performed By' },
      { key: 'createdAt', header: 'Created At (dd/mm/yyyy)' },
    ];

    // Generate Excel file with multiple sheets
    const csvBuffer = await arrayToCSV(csvData, headers as any, historyData.length > 0 ? [
      { name: 'Subscriptions', data: csvData, headers: headers as any },
      { name: 'Subscription History', data: historyData, headers: historyHeaders },
    ] : undefined);

    // Return Excel file
    const filename = `subscriptions_export_${new Date().toISOString().split('T')[0]}.xlsx`;

    return new NextResponse(new Uint8Array(csvBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
}

export const GET = withErrorHandler(exportSubscriptionsHandler, { requireAdmin: true, rateLimit: true, requireModule: 'subscriptions' });
