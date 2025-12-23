import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import ExcelJS from 'exceljs';
import {
  getStatusLabel,
  getPriorityLabel,
  getPurchaseTypeLabel,
  getCostTypeLabel,
  getPaymentModeLabel,
  getBillingCycleLabel,
} from '@/lib/purchase-request-utils';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'xlsx';
    const status = searchParams.get('status');

    // Build where clause
    const where: any = {};
    if (status && status !== 'all') {
      where.status = status;
    }

    // Fetch all purchase requests with items
    const requests = await prisma.purchaseRequest.findMany({
      where,
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: {
          orderBy: { itemNumber: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (format === 'json') {
      return NextResponse.json(requests);
    }

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Be Creative Portal';
    workbook.created = new Date();

    // Sheet 1: Purchase Requests
    const requestsSheet = workbook.addWorksheet('Purchase Requests');
    requestsSheet.columns = [
      { header: 'Reference Number', key: 'referenceNumber', width: 20 },
      { header: 'Title', key: 'title', width: 40 },
      { header: 'Request Date', key: 'requestDate', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Priority', key: 'priority', width: 12 },
      { header: 'Purchase Type', key: 'purchaseType', width: 20 },
      { header: 'Cost Type', key: 'costType', width: 15 },
      { header: 'Project Name', key: 'projectName', width: 25 },
      { header: 'Payment Mode', key: 'paymentMode', width: 18 },
      { header: 'Requester Name', key: 'requesterName', width: 25 },
      { header: 'Requester Email', key: 'requesterEmail', width: 30 },
      { header: 'Description', key: 'description', width: 50 },
      { header: 'Justification', key: 'justification', width: 50 },
      { header: 'Needed By Date', key: 'neededByDate', width: 15 },
      { header: 'Vendor Name', key: 'vendorName', width: 25 },
      { header: 'Vendor Contact', key: 'vendorContact', width: 20 },
      { header: 'Vendor Email', key: 'vendorEmail', width: 25 },
      { header: 'Total Amount', key: 'totalAmount', width: 15 },
      { header: 'Currency', key: 'currency', width: 10 },
      { header: 'Total Amount (QAR)', key: 'totalAmountQAR', width: 18 },
      { header: 'Total One-Time', key: 'totalOneTime', width: 15 },
      { header: 'Total Monthly', key: 'totalMonthly', width: 15 },
      { header: 'Total Contract Value', key: 'totalContractValue', width: 18 },
      { header: 'Item Count', key: 'itemCount', width: 12 },
      { header: 'Additional Notes', key: 'additionalNotes', width: 40 },
      { header: 'Reviewed By', key: 'reviewedBy', width: 25 },
      { header: 'Reviewed At', key: 'reviewedAt', width: 20 },
      { header: 'Review Notes', key: 'reviewNotes', width: 40 },
      { header: 'Completed At', key: 'completedAt', width: 20 },
      { header: 'Created At', key: 'createdAt', width: 20 },
    ];

    // Style header row
    requestsSheet.getRow(1).font = { bold: true };
    requestsSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF73C5D1' },
    };

    // Add data
    requests.forEach((req: any) => {
      requestsSheet.addRow({
        referenceNumber: req.referenceNumber,
        title: req.title,
        requestDate: req.requestDate ? new Date(req.requestDate).toLocaleDateString('en-GB') : '',
        status: getStatusLabel(req.status),
        priority: getPriorityLabel(req.priority),
        purchaseType: getPurchaseTypeLabel(req.purchaseType),
        costType: getCostTypeLabel(req.costType),
        projectName: req.projectName || '',
        paymentMode: getPaymentModeLabel(req.paymentMode),
        requesterName: req.requester.name || '',
        requesterEmail: req.requester.email,
        description: req.description || '',
        justification: req.justification || '',
        neededByDate: req.neededByDate ? new Date(req.neededByDate).toLocaleDateString('en-GB') : '',
        vendorName: req.vendorName || '',
        vendorContact: req.vendorContact || '',
        vendorEmail: req.vendorEmail || '',
        totalAmount: Number(req.totalAmount),
        currency: req.currency,
        totalAmountQAR: req.totalAmountQAR ? Number(req.totalAmountQAR) : null,
        totalOneTime: req.totalOneTime ? Number(req.totalOneTime) : null,
        totalMonthly: req.totalMonthly ? Number(req.totalMonthly) : null,
        totalContractValue: req.totalContractValue ? Number(req.totalContractValue) : null,
        itemCount: req.items.length,
        additionalNotes: req.additionalNotes || '',
        reviewedBy: req.reviewedBy?.name || req.reviewedBy?.email || '',
        reviewedAt: req.reviewedAt ? new Date(req.reviewedAt).toLocaleString('en-GB') : '',
        reviewNotes: req.reviewNotes || '',
        completedAt: req.completedAt ? new Date(req.completedAt).toLocaleString('en-GB') : '',
        createdAt: req.createdAt ? new Date(req.createdAt).toLocaleString('en-GB') : '',
      });
    });

    // Sheet 2: Line Items
    const itemsSheet = workbook.addWorksheet('Line Items');
    itemsSheet.columns = [
      { header: 'Reference Number', key: 'referenceNumber', width: 20 },
      { header: 'Item Number', key: 'itemNumber', width: 12 },
      { header: 'Description', key: 'description', width: 50 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Quantity', key: 'quantity', width: 10 },
      { header: 'Billing Cycle', key: 'billingCycle', width: 15 },
      { header: 'Duration (Months)', key: 'durationMonths', width: 18 },
      { header: 'Unit Price', key: 'unitPrice', width: 15 },
      { header: 'Currency', key: 'currency', width: 10 },
      { header: 'Total Price', key: 'totalPrice', width: 15 },
      { header: 'Amount Per Cycle', key: 'amountPerCycle', width: 18 },
      { header: 'Unit Price (QAR)', key: 'unitPriceQAR', width: 18 },
      { header: 'Total Price (QAR)', key: 'totalPriceQAR', width: 18 },
      { header: 'Product URL', key: 'productUrl', width: 40 },
      { header: 'Supplier', key: 'supplier', width: 25 },
      { header: 'Notes', key: 'notes', width: 40 },
    ];

    // Style header row
    itemsSheet.getRow(1).font = { bold: true };
    itemsSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF73C5D1' },
    };

    // Add data
    requests.forEach((req: any) => {
      req.items.forEach((item: any) => {
        itemsSheet.addRow({
          referenceNumber: req.referenceNumber,
          itemNumber: item.itemNumber,
          description: item.description,
          category: item.category || '',
          quantity: item.quantity,
          billingCycle: getBillingCycleLabel(item.billingCycle || 'ONE_TIME'),
          durationMonths: item.durationMonths || '',
          unitPrice: Number(item.unitPrice),
          currency: item.currency,
          totalPrice: Number(item.totalPrice),
          amountPerCycle: item.amountPerCycle ? Number(item.amountPerCycle) : '',
          unitPriceQAR: item.unitPriceQAR ? Number(item.unitPriceQAR) : null,
          totalPriceQAR: item.totalPriceQAR ? Number(item.totalPriceQAR) : null,
          productUrl: item.productUrl || '',
          supplier: item.supplier || '',
          notes: item.notes || '',
        });
      });
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Return file
    const filename = `purchase-requests-${new Date().toISOString().split('T')[0]}.xlsx`;

    return new NextResponse(new Uint8Array(buffer as any), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Purchase requests export error:', error);
    return NextResponse.json(
      { error: 'Failed to export purchase requests' },
      { status: 500 }
    );
  }
}
