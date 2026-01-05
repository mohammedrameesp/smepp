/**
 * @file route.ts
 * @description Get, update, and delete a single purchase request
 * @module projects/purchase-requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { updatePurchaseRequestSchema } from '@/lib/validations/purchase-request';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { calculatePurchaseRequestItems, CalculatedItem } from '@/lib/domains/projects/purchase-requests/purchase-request-creation';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

// GET - Get single purchase request
async function getPurchaseRequestHandler(request: NextRequest, context: APIContext) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const tenantId = session.user.organizationId;
    const id = context.params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const purchaseRequest = await prisma.purchaseRequest.findFirst({
      where: { id, tenantId },
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
    if (session.user.teamMemberRole !== 'ADMIN' && purchaseRequest.requesterId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(purchaseRequest);
}

// PUT - Update purchase request (only when PENDING)
async function updatePurchaseRequestHandler(request: NextRequest, context: APIContext) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const tenantId = session.user.organizationId;
    const id = context.params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Get current request within tenant
    const currentRequest = await prisma.purchaseRequest.findFirst({
      where: { id, tenantId },
      include: { items: true },
    });

    if (!currentRequest) {
      return NextResponse.json({ error: 'Purchase request not found' }, { status: 404 });
    }

    // Only requester can update (or admin)
    if (session.user.teamMemberRole !== 'ADMIN' && currentRequest.requesterId !== session.user.id) {
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
    const updateData: any = {};

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
          performedById: session.user.id,
          details: 'Request updated',
        },
      });

      return updated;
    });

    // Log activity
    await logAction(
      tenantId,
      session.user.id,
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
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const tenantId = session.user.organizationId;
    const id = context.params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Get current request within tenant
    const currentRequest = await prisma.purchaseRequest.findFirst({
      where: { id, tenantId },
    });

    if (!currentRequest) {
      return NextResponse.json({ error: 'Purchase request not found' }, { status: 404 });
    }

    // Only requester or admin can delete
    if (session.user.teamMemberRole !== 'ADMIN' && currentRequest.requesterId !== session.user.id) {
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
    await prisma.purchaseRequest.delete({
      where: { id },
    });

    // Log activity
    await logAction(
      tenantId,
      session.user.id,
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
