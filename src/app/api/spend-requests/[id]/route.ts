/**
 * @file route.ts
 * @description Get, update, and delete a single spend request
 * @module projects/spend-requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { updateSpendRequestSchema } from '@/features/spend-requests/validations';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { calculateSpendRequestItems, CalculatedItem } from '@/features/spend-requests/lib/spend-request-creation';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { invalidBodyResponse } from '@/lib/http/responses';
import { buildManagerAccessFilter, canAccessMember } from '@/lib/access-control/manager-filter';
import {
  getApprovalChain,
  getApprovalChainSummary,
  hasApprovalChain,
} from '@/features/approvals/lib';

// GET - Get single spend request
async function getSpendRequestHandler(request: NextRequest, context: APIContext) {
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

    const spendRequest = await db.spendRequest.findFirst({
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

    if (!spendRequest) {
      return NextResponse.json({ error: 'Spend request not found' }, { status: 404 });
    }

    // Check access permissions using centralized helper
    const accessFilter = await buildManagerAccessFilter(db, tenant, { domain: 'finance' });
    if (!canAccessMember(accessFilter, spendRequest.requesterId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Include approval chain if it exists
    const chainExists = await hasApprovalChain('SPEND_REQUEST', id);
    let approvalChain = null;
    let approvalSummary = null;

    if (chainExists) {
      approvalChain = await getApprovalChain('SPEND_REQUEST', id);
      approvalSummary = await getApprovalChainSummary('SPEND_REQUEST', id);

      // Add canCurrentUserApprove flag
      if (approvalSummary?.status === 'PENDING' && approvalChain && approvalChain.length > 0) {
        const currentStep = approvalChain.find(step => step.status === 'PENDING');
        if (currentStep) {
          // Get current user's approval capabilities
          const currentUserId = userId;
          const currentUserIsAdmin = !!(tenant?.isAdmin || tenant?.isOwner);
          const currentUserHasFinanceAccess = !!tenant?.hasFinanceAccess;

          // Determine if current user can approve based on their role matching the step's required role
          let canCurrentUserApprove = false;

          switch (currentStep.requiredRole) {
            case 'MANAGER': {
              // Check if current user is the requester's manager
              const directReports = await db.teamMember.findMany({
                where: { reportingToId: currentUserId },
                select: { id: true },
              });
              canCurrentUserApprove = directReports.some(r => r.id === spendRequest.requesterId);
              break;
            }
            case 'FINANCE_MANAGER':
              canCurrentUserApprove = currentUserHasFinanceAccess;
              break;
            case 'DIRECTOR':
              // Only admins can approve director-level steps
              canCurrentUserApprove = currentUserIsAdmin;
              break;
          }

          approvalSummary = {
            ...approvalSummary,
            canCurrentUserApprove,
          };
        }
      }
    }

    return NextResponse.json({
      ...spendRequest,
      approvalChain,
      approvalSummary,
    });
}

// PUT - Update purchase request (only when PENDING)
async function updateSpendRequestHandler(request: NextRequest, context: APIContext) {
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
    const currentRequest = await db.spendRequest.findFirst({
      where: { id },
      select: { id: true, status: true, requesterId: true, totalAmount: true, totalAmountQAR: true, purchaseType: true, referenceNumber: true, title: true },
    });

    if (!currentRequest) {
      return NextResponse.json({ error: 'Spend request not found' }, { status: 404 });
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
    const validation = updateSpendRequestSchema.safeParse(body);

    if (!validation.success) {
      return invalidBodyResponse(validation.error);
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

      const calculated = await calculateSpendRequestItems(data.items, formCurrency, isSubscriptionType, tenantId);
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
    const spendRequest = await prisma.$transaction(async (tx) => {
      // If items are being updated, delete old ones and create new ones
      if (itemsData) {
        await tx.spendRequestItem.deleteMany({
          where: { spendRequestId: id },
        });

        await tx.spendRequestItem.createMany({
          data: itemsData.map(item => ({
            ...item,
            spendRequestId: id,
          })),
        });
      }

      // Update the request
      const updated = await tx.spendRequest.update({
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
      await tx.spendRequestHistory.create({
        data: {
          spendRequestId: id,
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
      ActivityActions.SPEND_REQUEST_UPDATED,
      'SpendRequest',
      spendRequest.id,
      {
        referenceNumber: spendRequest.referenceNumber,
        changes: Object.keys(updateData),
      }
    );

    return NextResponse.json(spendRequest);
}

// DELETE - Delete purchase request (only when PENDING)
async function deleteSpendRequestHandler(request: NextRequest, context: APIContext) {
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
    const currentRequest = await db.spendRequest.findFirst({
      where: { id },
    });

    if (!currentRequest) {
      return NextResponse.json({ error: 'Spend request not found' }, { status: 404 });
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
    await db.spendRequest.delete({
      where: { id },
    });

    // Log activity
    await logAction(
      tenantId,
      userId,
      ActivityActions.SPEND_REQUEST_DELETED,
      'SpendRequest',
      id,
      {
        referenceNumber: currentRequest.referenceNumber,
        title: currentRequest.title,
      }
    );

    return NextResponse.json({ message: 'Spend request deleted successfully' });
}

export const GET = withErrorHandler(getSpendRequestHandler, { requireAuth: true, requireModule: 'spend-requests' });
export const PUT = withErrorHandler(updateSpendRequestHandler, { requireAuth: true, requireModule: 'spend-requests' });
export const DELETE = withErrorHandler(deleteSpendRequestHandler, { requireAuth: true, requireModule: 'spend-requests' });
