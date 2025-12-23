import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { updatePurchaseRequestSchema } from '@/lib/validations/purchase-request';
import { logAction, ActivityActions } from '@/lib/activity';
import { USD_TO_QAR_RATE } from '@/lib/constants';

// GET - Get single purchase request
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const purchaseRequest = await prisma.purchaseRequest.findUnique({
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
    if (session.user.role !== Role.ADMIN && purchaseRequest.requesterId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(purchaseRequest);
  } catch (error) {
    console.error('Purchase request GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchase request' },
      { status: 500 }
    );
  }
}

// PUT - Update purchase request (only when PENDING)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get current request
    const currentRequest = await prisma.purchaseRequest.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!currentRequest) {
      return NextResponse.json({ error: 'Purchase request not found' }, { status: 404 });
    }

    // Only requester can update (or admin)
    if (session.user.role !== Role.ADMIN && currentRequest.requesterId !== session.user.id) {
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

    // Calculate totals if items are being updated
    let totalAmount = Number(currentRequest.totalAmount);
    let totalAmountQAR = Number(currentRequest.totalAmountQAR);
    let totalOneTime = 0;
    let totalMonthly = 0;
    let totalContractValue = 0;
    let itemsData: any[] | undefined;

    if (data.items) {
      totalAmount = 0;
      totalAmountQAR = 0;

      itemsData = data.items.map((item, index) => {
        const totalPrice = item.quantity * item.unitPrice;
        const totalPriceQAR = item.currency === 'USD'
          ? totalPrice * USD_TO_QAR_RATE
          : totalPrice;
        const unitPriceQAR = item.currency === 'USD'
          ? item.unitPrice * USD_TO_QAR_RATE
          : item.unitPrice;

        // Calculate amount per cycle for recurring items
        const billingCycle = item.billingCycle || 'ONE_TIME';
        const durationMonths = item.durationMonths || null;
        const amountPerCycle = billingCycle !== 'ONE_TIME' ? totalPrice : null;
        const amountPerCycleQAR = amountPerCycle && item.currency === 'USD'
          ? amountPerCycle * USD_TO_QAR_RATE
          : amountPerCycle;

        // Calculate totals based on billing cycle
        if (billingCycle === 'ONE_TIME') {
          totalOneTime += totalPriceQAR;
          totalAmount += totalPrice;
          totalAmountQAR += totalPriceQAR;
          totalContractValue += totalPriceQAR;
        } else if (billingCycle === 'MONTHLY') {
          totalMonthly += totalPriceQAR;
          const months = durationMonths || 12;
          const contractValue = totalPriceQAR * months;
          totalContractValue += contractValue;
          totalAmount += totalPrice * months;
          totalAmountQAR += contractValue;
        } else if (billingCycle === 'YEARLY') {
          totalMonthly += totalPriceQAR / 12;
          totalContractValue += totalPriceQAR;
          totalAmount += totalPrice;
          totalAmountQAR += totalPriceQAR;
        }

        return {
          itemNumber: index + 1,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          currency: item.currency,
          unitPriceQAR,
          totalPrice,
          totalPriceQAR,
          billingCycle,
          durationMonths,
          amountPerCycle: amountPerCycleQAR,
          productUrl: item.productUrl || null,
          category: item.category || null,
          supplier: item.supplier || null,
          notes: item.notes || null,
        };
      });
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
  } catch (error) {
    console.error('Purchase request PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update purchase request' },
      { status: 500 }
    );
  }
}

// DELETE - Delete purchase request (only when PENDING)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get current request
    const currentRequest = await prisma.purchaseRequest.findUnique({
      where: { id },
    });

    if (!currentRequest) {
      return NextResponse.json({ error: 'Purchase request not found' }, { status: 404 });
    }

    // Only requester or admin can delete
    if (session.user.role !== Role.ADMIN && currentRequest.requesterId !== session.user.id) {
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
  } catch (error) {
    console.error('Purchase request DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete purchase request' },
      { status: 500 }
    );
  }
}
