/**
 * @file route.ts
 * @description Get, update, and delete a single purchase request
 * @module projects/purchase-requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { updatePurchaseRequestSchema } from '@/lib/validations/projects/purchase-request';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { calculatePurchaseRequestItems, CalculatedItem } from '@/features/purchase-requests/lib/purchase-request-creation';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

// GET - Get single purchase request
async function getPurchaseRequestHandler(request: NextRequest, context: APIContext) {
    const { tenant, prisma: tenantPrisma } = context;
    if (!tenant?.tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }
    const db = tenantPrisma as TenantPrismaClient;
    const userId = tenant.userId;

    const id = context.params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const purchaseRequest = await db.purchaseRequest.findFirst({
      where: { id },
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
        history: {
          include: {
            performedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!purchaseRequest) {
      return NextResponse.json({ error: 'Purchase request not found' }, { status: 404 });
    }

    // Non-admin users can only view their own requests
    const isOwnerOrAdmin = tenant?.isOwner || tenant?.isAdmin;
    if (!isOwnerOrAdmin && purchaseRequest.requesterId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(purchaseRequest);
}

// PUT - Update purchase request (only when PENDING)
async function updatePurchaseRequestHandler(request: NextRequest, context: APIContext) {
    const { tenant, prisma: tenantPrisma } = context;
    if (!tenant?.tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }
    const db = tenantPrisma as TenantPrismaClient;
    const tenantId = tenant.tenantId;
    const userId = tenant.userId;

    const id = context.params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Get current request within tenant
    const currentRequest = await db.purchaseRequest.findFirst({
      where: { id },
      select: { id: true, status: true, requesterId: true, totalAmount: true, totalAmountQAR: true, purchaseType: true, referenceNumber: true, title: true },
    });

    if (!currentRequest) {
      return NextResponse.json({ error: 'Purchase request not found' }, { status: 404 });
    }

    // Only requester can update (or admin)
    const isOwnerOrAdmin = tenant?.isOwner || tenant?.isAdmin;
    if (!isOwnerOrAdmin && currentRequest.requesterId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Can only update PENDING requests
    if (currentRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Only pending requests can be updated' },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = updatePurchaseRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: validation.error.issues
      }, { status: 400 });
    }

    const data = validation.data;

    // Calculate totals if items are being updated using shared helper
    let totalAmount = Number(currentRequest.totalAmount);
    let totalAmountQAR = Number(currentRequest.totalAmountQAR);
    let totalOneTime = 0;
    let totalMonthly = 0;
    let totalContractValue = 0;
    let itemsData: CalculatedItem[] | undefined;

    if (data.items) {
      const formCurrency = data.items[0]?.currency || 'QAR';
      const isSubscriptionType = currentRequest.purchaseType === 'SOFTWARE_SUBSCRIPTION';

      const calculated = await calculatePurchaseRequestItems(data.items, formCurrency, isSubscriptionType, tenantId);
      itemsData = calculated.items;
      totalAmount = calculated.totalAmount;
      totalAmountQAR = calculated.totalAmountQAR;
      totalOneTime = calculated.totalOneTime;
      totalMonthly = calculated.totalMonthly;
      totalContractValue = calculated.totalContractValue;
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.justification !== undefined) updateData.justification = data.justification;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.neededByDate !== undefined) {
      updateData.neededByDate = data.neededByDate ? new Date(data.neededByDate) : null;
    }

    // New fields from prototype
    if (data.purchaseType !== undefined) updateData.purchaseType = data.purchaseType;
    if (data.costType !== undefined) updateData.costType = data.costType;
    if (data.projectName !== undefined) updateData.projectName = data.projectName;
    if (data.paymentMode !== undefined) updateData.paymentMode = data.paymentMode;

    // Vendor details
    if (data.vendorName !== undefined) updateData.vendorName = data.vendorName;
    if (data.vendorContact !== undefined) updateData.vendorContact = data.vendorContact;
    if (data.vendorEmail !== undefined) updateData.vendorEmail = data.vendorEmail;

    // Additional notes
    if (data.additionalNotes !== undefined) updateData.additionalNotes = data.additionalNotes;

    if (itemsData) {
      updateData.totalAmount = totalAmount;
      updateData.totalAmountQAR = totalAmountQAR;
      updateData.totalOneTime = totalOneTime > 0 ? totalOneTime : null;
      updateData.totalMonthly = totalMonthly > 0 ? totalMonthly : null;
      updateData.totalContractValue = totalContractValue > 0 ? totalContractValue : null;
      updateData.currency = data.items![0]?.currency || 'QAR';
    }

    // Update purchase request
    const purchaseRequest = await prisma.$transaction(async (tx) => {
      // If items are being updated, delete old ones and create new ones
      if (itemsData) {
        await tx.purchaseRequestItem.deleteMany({
          where: { purchaseRequestId: id },
        });

        await tx.purchaseRequestItem.createMany({
          data: itemsData.map(item => ({
            ...item,
            purchaseRequestId: id,
          })),
        });
      }

      // Update the request
      const updated = await tx.purchaseRequest.update({
        where: { id },
        data: updateData,
        include: {
          requester: {
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
      });

      // Create history entry
      await tx.purchaseRequestHistory.create({
        data: {
          purchaseRequestId: id,
          action: 'UPDATED',
          performedById: userId,
          details: 'Request updated',
        },
      });

      return updated;
    });

    // Log activity
    await logAction(
      tenantId,
      userId,
      ActivityActions.PURCHASE_REQUEST_UPDATED,
      'PurchaseRequest',
      purchaseRequest.id,
      {
        referenceNumber: purchaseRequest.referenceNumber,
        changes: Object.keys(updateData),
      }
    );

    return NextResponse.json(purchaseRequest);
}

// DELETE - Delete purchase request (only when PENDING)
async function deletePurchaseRequestHandler(request: NextRequest, context: APIContext) {
    const { tenant, prisma: tenantPrisma } = context;
    if (!tenant?.tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }
    const db = tenantPrisma as TenantPrismaClient;
    const tenantId = tenant.tenantId;
    const userId = tenant.userId;

    const id = context.params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Get current request within tenant
    const currentRequest = await db.purchaseRequest.findFirst({
      where: { id },
    });

    if (!currentRequest) {
      return NextResponse.json({ error: 'Purchase request not found' }, { status: 404 });
    }

    // Only requester or admin can delete
    const isOwnerOrAdmin = tenant?.isOwner || tenant?.isAdmin;
    if (!isOwnerOrAdmin && currentRequest.requesterId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Can only delete PENDING requests
    if (currentRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Only pending requests can be deleted' },
        { status: 400 }
      );
    }

    // Delete the request (cascades to items and history)
    await db.purchaseRequest.delete({
      where: { id },
    });

    // Log activity
    await logAction(
      tenantId,
      userId,
      ActivityActions.PURCHASE_REQUEST_DELETED,
      'PurchaseRequest',
      id,
      {
        referenceNumber: currentRequest.referenceNumber,
        title: currentRequest.title,
      }
    );

    return NextResponse.json({ message: 'Purchase request deleted successfully' });
}

export const GET = withErrorHandler(getPurchaseRequestHandler, { requireAuth: true, requireModule: 'purchase-requests' });
export const PUT = withErrorHandler(updatePurchaseRequestHandler, { requireAuth: true, requireModule: 'purchase-requests' });
export const DELETE = withErrorHandler(deletePurchaseRequestHandler, { requireAuth: true, requireModule: 'purchase-requests' });
