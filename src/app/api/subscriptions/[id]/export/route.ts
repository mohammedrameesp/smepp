/**
 * @file route.ts
 * @description Single subscription export to Excel endpoint
 * @module operations/subscriptions
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { arrayToCSV, formatDateForCSV, formatCurrencyForCSV } from '@/lib/csv-utils';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

async function exportSingleSubscriptionHandler(_request: NextRequest, context: APIContext) {
    const { tenant, params } = context;
    const tenantId = tenant!.tenantId;
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Fetch subscription within tenant with related data
    const subscription = await prisma.subscription.findFirst({
      where: { id, tenantId },
      include: {
        assignedUser: {
          select: { name: true, email: true },
        },
      },
    });

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    // Transform data for CSV (single subscription in array format)
    const csvData = [{
      serviceName: subscription.serviceName,
      category: subscription.category || '',
      accountId: subscription.accountId || '',
      vendor: subscription.vendor || '',
      purchaseDate: formatDateForCSV(subscription.purchaseDate),
      renewalDate: formatDateForCSV(subscription.renewalDate),
      billingCycle: subscription.billingCycle,
      costPerCycle: formatCurrencyForCSV(subscription.costPerCycle ? Number(subscription.costPerCycle) : null),
      costCurrency: subscription.costCurrency || 'QAR',
      costQAR: formatCurrencyForCSV(subscription.costQAR ? Number(subscription.costQAR) : null),
      status: subscription.status,
      autoRenew: subscription.autoRenew ? 'Yes' : 'No',
      paymentMethod: subscription.paymentMethod || '',
      notes: subscription.notes || '',
      assignedUserName: subscription.assignedUser?.name || '',
      assignedUserEmail: subscription.assignedUser?.email || '',
      createdAt: formatDateForCSV(subscription.createdAt),
      updatedAt: formatDateForCSV(subscription.updatedAt),
    }];

    // Define CSV headers (matching bulk export format)
    const headers = [
      { key: 'serviceName', header: 'Service Name' },
      { key: 'category', header: 'Category' },
      { key: 'accountId', header: 'Account ID/Email' },
      { key: 'vendor', header: 'Vendor' },
      { key: 'purchaseDate', header: 'Purchase Date (dd/mm/yyyy)' },
      { key: 'renewalDate', header: 'Renewal Date (dd/mm/yyyy)' },
      { key: 'billingCycle', header: 'Billing Cycle' },
      { key: 'costPerCycle', header: 'Cost Per Cycle' },
      { key: 'costCurrency', header: 'Cost Currency' },
      { key: 'costQAR', header: 'Cost USD' },
      { key: 'status', header: 'Status' },
      { key: 'autoRenew', header: 'Auto Renew' },
      { key: 'paymentMethod', header: 'Payment Method' },
      { key: 'notes', header: 'Notes' },
      { key: 'assignedUserName', header: 'Assigned User Name' },
      { key: 'assignedUserEmail', header: 'Assigned User Email' },
      { key: 'createdAt', header: 'Created At' },
      { key: 'updatedAt', header: 'Updated At' },
    ];

    // Generate CSV/Excel
    const csvBuffer = await arrayToCSV(csvData, headers as any);

    // Return Excel file
    const filename = `subscription_${subscription.serviceName.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;

    return new NextResponse(new Uint8Array(csvBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
}

export const GET = withErrorHandler(exportSingleSubscriptionHandler, { requireAdmin: true, requireModule: 'subscriptions' });
