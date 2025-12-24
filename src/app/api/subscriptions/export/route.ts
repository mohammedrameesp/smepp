import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { arrayToCSV, formatDateForCSV, formatCurrencyForCSV } from '@/lib/csv-utils';
import { withErrorHandler } from '@/lib/http/handler';

async function exportSubscriptionsHandler(request: NextRequest) {
  console.log('Starting subscription export...');
  // Check authentication
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  console.log('Authentication passed');

  // Require organization context for tenant isolation
  if (!session.user.organizationId) {
    return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
  }

  const tenantId = session.user.organizationId;

  // Fetch subscriptions for current tenant only with related data including history
  const subscriptions = await prisma.subscription.findMany({
    where: { tenantId },
    include: {
      assignedUser: {
        select: { name: true, email: true },
      },
      history: {
        include: {
          performer: {
            select: { name: true, email: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

    console.log(`Fetched ${subscriptions.length} subscriptions`);

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
      assignedUserId: sub.assignedUserId || '',
      assignedUserName: sub.assignedUser?.name || '',
      assignedUserEmail: sub.assignedUser?.email || '',
      cancelledAt: formatDateForCSV(sub.cancelledAt),
      reactivatedAt: formatDateForCSV(sub.reactivatedAt),
      lastActiveRenewalDate: formatDateForCSV(sub.lastActiveRenewalDate),
      createdAt: formatDateForCSV(sub.createdAt),
      updatedAt: formatDateForCSV(sub.updatedAt),
    }));

    console.log(`Transformed ${csvData.length} subscription records`);

    // Transform subscription history for separate sheet
    const historyData: any[] = [];
    console.log('Starting history transformation...');
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
              performedBy: h.performer?.name || h.performer?.email || 'System',
              createdAt: formatDateForCSV(h.createdAt),
            });
          });
        }
      });
      console.log(`Transformed ${historyData.length} history records`);
    } catch (historyError) {
      console.error('Error transforming history:', historyError);
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
      { key: 'assignedUserId', header: 'Assigned User ID' },
      { key: 'assignedUserName', header: 'Assigned User Name' },
      { key: 'assignedUserEmail', header: 'Assigned User Email' },
      { key: 'cancelledAt', header: 'Cancelled At (dd/mm/yyyy)' },
      { key: 'reactivatedAt', header: 'Reactivated At (dd/mm/yyyy)' },
      { key: 'lastActiveRenewalDate', header: 'Last Active Renewal Date (dd/mm/yyyy)' },
      { key: 'createdAt', header: 'Created At (dd/mm/yyyy)' },
      { key: 'updatedAt', header: 'Updated At (dd/mm/yyyy)' },
    ];

    // Define headers for history sheet
    const historyHeaders = [
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

    console.log('Generating Excel file with sheets...');
    console.log(`Will create ${historyData.length > 0 ? '2' : '1'} sheets`);

    // Generate Excel file with multiple sheets
    const csvBuffer = await arrayToCSV(csvData, headers as any, historyData.length > 0 ? [
      { name: 'Subscriptions', data: csvData, headers: headers as any },
      { name: 'Subscription History', data: historyData, headers: historyHeaders as any },
    ] : undefined);

    console.log('Excel file generated successfully');

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

export const GET = withErrorHandler(exportSubscriptionsHandler, { requireAdmin: true, rateLimit: true });
