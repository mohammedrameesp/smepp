import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { arrayToCSV, formatDateForCSV, formatCurrencyForCSV } from '@/lib/csv-utils';

interface Props {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: Props) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Fetch subscription with related data
    const subscription = await prisma.subscription.findUnique({
      where: { id },
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
  } catch (error) {
    console.error('Subscription export error:', error);
    return NextResponse.json({ error: 'Failed to export subscription' }, { status: 500 });
  }
}
