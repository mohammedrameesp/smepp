/**
 * @file route.ts
 * @description Export spend requests to Excel or JSON
 * @module projects/spend-requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import {
  getStatusLabel,
  getPriorityLabel,
  getPurchaseTypeLabel,
  getCostTypeLabel,
  getPaymentModeLabel,
  getBillingCycleLabel,
} from '@/features/spend-requests/lib/spend-request-utils';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { generateMultiSheetExport, safeFormatDate, safeString } from '@/lib/core/import-export';

async function exportSpendRequestsHandler(request: NextRequest, context: APIContext) {
    const { tenant, prisma: tenantPrisma } = context;
    if (!tenant?.tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }
    const db = tenantPrisma as TenantPrismaClient;
    const tenantId = tenant.tenantId;

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'xlsx';
    const status = searchParams.get('status');

    // Build where clause (tenant filtering is handled by db extension)
    const where: Record<string, unknown> = {};
    if (status && status !== 'all') {
      where.status = status;
    }

    // Fetch all purchase requests with items
    const requests = await db.spendRequest.findMany({
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

    // Define headers for Spend Requests sheet
    const requestHeaders = [
      { key: 'referenceNumber', header: 'Reference Number' },
      { key: 'title', header: 'Title' },
      { key: 'requestDate', header: 'Request Date' },
      { key: 'status', header: 'Status' },
      { key: 'priority', header: 'Priority' },
      { key: 'purchaseType', header: 'Purchase Type' },
      { key: 'costType', header: 'Cost Type' },
      { key: 'projectName', header: 'Project Name' },
      { key: 'paymentMode', header: 'Payment Mode' },
      { key: 'requesterName', header: 'Requester Name' },
      { key: 'requesterEmail', header: 'Requester Email' },
      { key: 'description', header: 'Description' },
      { key: 'justification', header: 'Justification' },
      { key: 'neededByDate', header: 'Needed By Date' },
      { key: 'vendorName', header: 'Vendor Name' },
      { key: 'vendorContact', header: 'Vendor Contact' },
      { key: 'vendorEmail', header: 'Vendor Email' },
      { key: 'totalAmount', header: 'Total Amount' },
      { key: 'currency', header: 'Currency' },
      { key: 'totalAmountQAR', header: 'Total Amount (QAR)' },
      { key: 'totalOneTime', header: 'Total One-Time' },
      { key: 'totalMonthly', header: 'Total Monthly' },
      { key: 'totalContractValue', header: 'Total Contract Value' },
      { key: 'itemCount', header: 'Item Count' },
      { key: 'additionalNotes', header: 'Additional Notes' },
      { key: 'reviewedBy', header: 'Reviewed By' },
      { key: 'reviewedAt', header: 'Reviewed At' },
      { key: 'reviewNotes', header: 'Review Notes' },
      { key: 'completedAt', header: 'Completed At' },
      { key: 'createdAt', header: 'Created At' },
    ];

    // Transform requests data for export
    const requestsData = requests.map((req) => ({
      referenceNumber: safeString(req.referenceNumber),
      title: safeString(req.title),
      requestDate: safeFormatDate(req.requestDate),
      status: getStatusLabel(req.status),
      priority: getPriorityLabel(req.priority),
      purchaseType: getPurchaseTypeLabel(req.purchaseType),
      costType: getCostTypeLabel(req.costType),
      projectName: safeString(req.projectName),
      paymentMode: getPaymentModeLabel(req.paymentMode),
      requesterName: safeString(req.requester.name),
      requesterEmail: safeString(req.requester.email),
      description: safeString(req.description),
      justification: safeString(req.justification),
      neededByDate: safeFormatDate(req.neededByDate),
      vendorName: safeString(req.vendorName),
      vendorContact: safeString(req.vendorContact),
      vendorEmail: safeString(req.vendorEmail),
      totalAmount: Number(req.totalAmount),
      currency: safeString(req.currency),
      totalAmountQAR: req.totalAmountQAR ? Number(req.totalAmountQAR) : '',
      totalOneTime: req.totalOneTime ? Number(req.totalOneTime) : '',
      totalMonthly: req.totalMonthly ? Number(req.totalMonthly) : '',
      totalContractValue: req.totalContractValue ? Number(req.totalContractValue) : '',
      itemCount: req.items.length,
      additionalNotes: safeString(req.additionalNotes),
      reviewedBy: safeString(req.reviewedBy?.name || req.reviewedBy?.email),
      reviewedAt: safeFormatDate(req.reviewedAt),
      reviewNotes: safeString(req.reviewNotes),
      completedAt: safeFormatDate(req.completedAt),
      createdAt: safeFormatDate(req.createdAt),
    }));

    // Define headers for Line Items sheet
    const itemHeaders = [
      { key: 'referenceNumber', header: 'Reference Number' },
      { key: 'itemNumber', header: 'Item Number' },
      { key: 'description', header: 'Description' },
      { key: 'category', header: 'Category' },
      { key: 'quantity', header: 'Quantity' },
      { key: 'billingCycle', header: 'Billing Cycle' },
      { key: 'durationMonths', header: 'Duration (Months)' },
      { key: 'unitPrice', header: 'Unit Price' },
      { key: 'currency', header: 'Currency' },
      { key: 'totalPrice', header: 'Total Price' },
      { key: 'amountPerCycle', header: 'Amount Per Cycle' },
      { key: 'unitPriceQAR', header: 'Unit Price (QAR)' },
      { key: 'totalPriceQAR', header: 'Total Price (QAR)' },
      { key: 'productUrl', header: 'Product URL' },
      { key: 'supplier', header: 'Supplier' },
      { key: 'notes', header: 'Notes' },
    ];

    // Transform line items data for export
    const itemsData: Record<string, unknown>[] = [];
    requests.forEach((req) => {
      req.items.forEach((item) => {
        itemsData.push({
          referenceNumber: safeString(req.referenceNumber),
          itemNumber: item.itemNumber,
          description: safeString(item.description),
          category: safeString(item.category),
          quantity: item.quantity,
          billingCycle: getBillingCycleLabel(item.billingCycle || 'ONE_TIME'),
          durationMonths: item.durationMonths || '',
          unitPrice: Number(item.unitPrice),
          currency: safeString(item.currency),
          totalPrice: Number(item.totalPrice),
          amountPerCycle: item.amountPerCycle ? Number(item.amountPerCycle) : '',
          unitPriceQAR: item.unitPriceQAR ? Number(item.unitPriceQAR) : '',
          totalPriceQAR: item.totalPriceQAR ? Number(item.totalPriceQAR) : '',
          productUrl: safeString(item.productUrl),
          supplier: safeString(item.supplier),
          notes: safeString(item.notes),
        });
      });
    });

    // Generate multi-sheet Excel export
    return await generateMultiSheetExport(
      [
        { name: 'Spend Requests', data: requestsData, headers: requestHeaders },
        { name: 'Line Items', data: itemsData, headers: itemHeaders },
      ],
      'spend-requests'
    );
}

export const GET = withErrorHandler(exportSpendRequestsHandler, { requireAdmin: true, requireModule: 'spend-requests' });

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes: Added review summary
 * Issues: None identified
 */
