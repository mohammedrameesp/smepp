/**
 * @file route.ts
 * @description List and create purchase requests
 * @module projects/purchase-requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { Prisma, PurchaseRequestStatus, PurchaseRequestPriority } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { createPurchaseRequestSchema } from '@/lib/validations/purchase-request';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { generatePurchaseRequestNumber } from '@/lib/purchase-request-utils';
import {
  calculatePurchaseRequestItems,
  sendPurchaseRequestNotifications,
} from '@/lib/domains/projects/purchase-requests/purchase-request-creation';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

// GET - List purchase requests
async function getPurchaseRequestsHandler(request: NextRequest, context: APIContext) {
    const { tenant } = context;
    const tenantId = tenant!.tenantId;
    const userId = tenant!.userId;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Build where clause with tenant filtering
    const where: Prisma.PurchaseRequestWhereInput = { tenantId };

    // Non-admin users can only see their own requests
    // Note: orgRole contains ADMIN/MEMBER based on TeamMemberRole
    if (tenant!.orgRole !== 'ADMIN') {
      where.requesterId = userId;
    }

    if (status) {
      where.status = status as PurchaseRequestStatus;
    }

    if (priority) {
      where.priority = priority as PurchaseRequestPriority;
    }

    if (search) {
      where.OR = [
        { referenceNumber: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get total count and requests
    const [total, requests] = await Promise.all([
      prisma.purchaseRequest.count({ where }),
      prisma.purchaseRequest.findMany({
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
          items: true,
          _count: {
            select: {
              items: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      requests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
}

// POST - Create new purchase request
async function createPurchaseRequestHandler(request: NextRequest, context: APIContext) {
    const { tenant } = context;
    const tenantId = tenant!.tenantId;
    const userId = tenant!.userId;

    // Parse and validate request body
    const body = await request.json();
    const validation = createPurchaseRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: validation.error.issues
      }, { status: 400 });
    }

    const data = validation.data;

    // Generate reference number
    const referenceNumber = await generatePurchaseRequestNumber(prisma, tenantId);

    // Get form-level currency (use item currency as fallback for backwards compatibility)
    const formCurrency = data.currency || data.items[0]?.currency || 'QAR';
    const isSubscriptionType = data.purchaseType === 'SOFTWARE_SUBSCRIPTION';

    // Calculate item totals and QAR conversions using helper
    const {
      items: itemsWithCalculations,
      totalAmount,
      totalAmountQAR,
      totalOneTime,
      totalMonthly,
      totalContractValue,
    } = await calculatePurchaseRequestItems(data.items, formCurrency, isSubscriptionType, tenantId);

    // Create purchase request with items
    const purchaseRequest = await prisma.purchaseRequest.create({
      data: {
        referenceNumber,
        requesterId: userId,
        title: data.title,
        description: data.description || null,
        justification: data.justification || null,
        priority: data.priority,
        neededByDate: data.neededByDate ? new Date(data.neededByDate) : null,
        // New fields from prototype
        purchaseType: data.purchaseType,
        costType: data.costType,
        projectName: data.projectName || null,
        paymentMode: data.paymentMode,
        // Vendor details
        vendorName: data.vendorName || null,
        vendorContact: data.vendorContact || null,
        vendorEmail: data.vendorEmail || null,
        // Additional notes
        additionalNotes: data.additionalNotes || null,
        // Totals
        totalAmount,
        currency: formCurrency,
        totalAmountQAR,
        totalOneTime: totalOneTime > 0 ? totalOneTime : null,
        totalMonthly: totalMonthly > 0 ? totalMonthly : null,
        totalContractValue: totalContractValue > 0 ? totalContractValue : null,
        tenantId,
        items: {
          create: itemsWithCalculations.map(item => ({
            ...item,
            tenantId,
          })),
        },
        history: {
          create: {
            action: 'CREATED',
            newStatus: 'PENDING',
            performedById: userId,
            details: `Request created with ${data.items.length} item(s)`,
          },
        },
      },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: true,
      },
    });

    // Log activity
    await logAction(
      tenantId,
      userId,
      ActivityActions.PURCHASE_REQUEST_CREATED,
      'PurchaseRequest',
      purchaseRequest.id,
      {
        referenceNumber,
        title: data.title,
        itemCount: data.items.length,
        totalAmount,
        currency: purchaseRequest.currency,
      }
    );

    // Send notifications (non-blocking)
    try {
      await sendPurchaseRequestNotifications({
        tenantId,
        userId,
        purchaseRequest,
        referenceNumber,
        title: data.title,
        totalAmount,
        totalAmountQAR,
        itemCount: data.items.length,
        priority: data.priority,
      });
    } catch (notificationError) {
      console.error('Failed to send notification:', notificationError);
      // Don't fail the request if notifications fail
    }

    return NextResponse.json(purchaseRequest, { status: 201 });
}

export const GET = withErrorHandler(getPurchaseRequestsHandler, { requireAuth: true, requireModule: 'purchase-requests' });
export const POST = withErrorHandler(createPurchaseRequestHandler, { requireAuth: true, requireModule: 'purchase-requests' });
