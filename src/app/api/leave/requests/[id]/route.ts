/**
 * @file route.ts
 * @description Leave request detail operations - get, update, delete individual requests
 * @module hr/leave
 */

import { NextRequest, NextResponse } from 'next/server';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { updateLeaveRequestSchema } from '@/features/leave/validations/leave';
import { logAction, ActivityActions } from '@/lib/core/activity';
import {
  calculateWorkingDays,
  canEditLeaveRequest,
} from '@/features/leave/lib/leave-utils';
import { validateNoOverlap } from '@/features/leave/lib/leave-request-validation';
import { cleanupStorageFile } from '@/lib/storage/cleanup';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import {
  getApprovalChain,
  getApprovalChainSummary,
  hasApprovalChain,
} from '@/features/approvals/lib';

async function getLeaveRequestHandler(request: NextRequest, context: APIContext) {
    const { tenant, params, prisma: tenantPrisma } = context;
    if (!tenant?.tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }
    const db = tenantPrisma as TenantPrismaClient;
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Use findFirst (tenant filtering is automatic via db)
    const leaveRequest = await db.leaveRequest.findFirst({
      where: { id },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        leaveType: {
          select: {
            id: true,
            name: true,
            color: true,
            requiresDocument: true,
            accrualBased: true,
          },
        },
        approver: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        history: {
          include: {
            performedBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!leaveRequest) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
    }

    // Check access permissions
    const hasFullAccess = tenant?.isOwner || tenant?.isAdmin || tenant?.hasHRAccess;
    const isOwnRequest = leaveRequest.memberId === tenant.userId;

    if (!hasFullAccess && !isOwnRequest) {
      // Check if manager viewing direct report's request
      if (tenant?.canApprove) {
        const directReports = await db.teamMember.findMany({
          where: { reportingToId: tenant.userId },
          select: { id: true },
        });
        const directReportIds = directReports.map(r => r.id);
        if (!directReportIds.includes(leaveRequest.memberId)) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
      } else {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Include approval chain if it exists
    const chainExists = await hasApprovalChain('LEAVE_REQUEST', id);
    let approvalChain = null;
    let approvalSummary = null;

    if (chainExists) {
      approvalChain = await getApprovalChain('LEAVE_REQUEST', id);
      approvalSummary = await getApprovalChainSummary('LEAVE_REQUEST', id);
    }

    return NextResponse.json({
      ...leaveRequest,
      approvalChain,
      approvalSummary,
    });
}

export const GET = withErrorHandler(getLeaveRequestHandler, { requireAuth: true, requireModule: 'leave' });

async function updateLeaveRequestHandler(request: NextRequest, context: APIContext) {
    const { tenant, params, prisma: tenantPrisma } = context;
    if (!tenant?.tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }
    const db = tenantPrisma as TenantPrismaClient;
    const tenantId = tenant.tenantId;
    const currentUserId = tenant.userId;
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const validation = updateLeaveRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: validation.error.issues,
      }, { status: 400 });
    }

    const data = validation.data;

    // Get existing request within tenant
    const existing = await db.leaveRequest.findFirst({
      where: { id },
      include: {
        leaveType: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
    }

    // Only owner can edit their request
    const isOwnerOrAdminRole = tenant?.isOwner || tenant?.isAdmin;
    if (existing.memberId !== currentUserId && !isOwnerOrAdminRole) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if can be edited
    if (!canEditLeaveRequest(existing.status, existing.startDate)) {
      return NextResponse.json({
        error: 'Only pending requests with future start dates can be edited',
      }, { status: 400 });
    }

    // Calculate changes
    const startDate = data.startDate ? new Date(data.startDate) : existing.startDate;
    const endDate = data.endDate ? new Date(data.endDate) : existing.endDate;
    const requestType = data.requestType ?? existing.requestType;

    // Validate date range
    if (startDate > endDate) {
      return NextResponse.json({
        error: 'End date must be on or after start date',
      }, { status: 400 });
    }

    // Validate half-day requests must be single day
    if (requestType !== 'FULL_DAY') {
      if (startDate.toDateString() !== endDate.toDateString()) {
        return NextResponse.json({
          error: 'Half-day requests must be for a single day',
        }, { status: 400 });
      }
    }

    // Fetch organization's weekend days configuration
    const organization = await db.organization.findUnique({
      where: { id: tenantId },
      select: { weekendDays: true },
    });
    const weekendDays = organization?.weekendDays ?? [5, 6]; // Default to Friday-Saturday

    // Check for overlapping requests (excluding current request) within tenant
    const overlappingRequests = await db.leaveRequest.findMany({
      where: {
        id: { not: id },
        memberId: existing.memberId,
        status: { in: ['PENDING', 'APPROVED'] },
      },
      select: { startDate: true, endDate: true },
    });

    const overlapResult = validateNoOverlap(startDate, endDate, overlappingRequests);
    if (!overlapResult.valid) {
      return NextResponse.json({ error: overlapResult.error }, { status: 400 });
    }

    // Calculate new working days (include weekends for accrual-based leave like Annual Leave)
    const includeWeekends = existing.leaveType.accrualBased === true;
    const newTotalDays = calculateWorkingDays(startDate, endDate, requestType, includeWeekends, weekendDays);
    const oldTotalDays = Number(existing.totalDays);
    const daysDiff = newTotalDays - oldTotalDays;

    if (newTotalDays === 0) {
      return NextResponse.json({
        error: 'No working days in the selected date range',
      }, { status: 400 });
    }

    // Update in transaction
    const leaveRequest = await db.$transaction(async (tx) => {
      // Update the request
      const request = await tx.leaveRequest.update({
        where: { id },
        data: {
          startDate,
          endDate,
          requestType,
          totalDays: newTotalDays,
          reason: data.reason !== undefined ? data.reason : existing.reason,
          documentUrl: data.documentUrl !== undefined ? data.documentUrl : existing.documentUrl,
          emergencyContact: data.emergencyContact !== undefined ? data.emergencyContact : existing.emergencyContact,
          emergencyPhone: data.emergencyPhone !== undefined ? data.emergencyPhone : existing.emergencyPhone,
        },
        include: {
          member: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          leaveType: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
        },
      });

      // Update balance pending if days changed
      if (daysDiff !== 0) {
        const year = startDate.getFullYear();
        await tx.leaveBalance.update({
          where: {
            tenantId_memberId_leaveTypeId_year: {
              tenantId,
              memberId: existing.memberId,
              leaveTypeId: existing.leaveTypeId,
              year,
            },
          },
          data: {
            pending: {
              increment: daysDiff,
            },
          },
        });
      }

      // Create history entry
      await tx.leaveRequestHistory.create({
        data: {
          leaveRequestId: id,
          action: 'UPDATED',
          oldStatus: existing.status,
          newStatus: existing.status,
          changes: data,
          performedById: currentUserId,
        },
      });

      return request;
    });

    await logAction(
      tenantId,
      currentUserId,
      ActivityActions.LEAVE_REQUEST_UPDATED,
      'LeaveRequest',
      leaveRequest.id,
      { requestNumber: leaveRequest.requestNumber, changes: data }
    );

    return NextResponse.json(leaveRequest);
}

export const PUT = withErrorHandler(updateLeaveRequestHandler, { requireAuth: true, requireModule: 'leave' });

async function deleteLeaveRequestHandler(request: NextRequest, context: APIContext) {
    const { tenant, params, prisma: tenantPrisma } = context;
    if (!tenant?.tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }
    const db = tenantPrisma as TenantPrismaClient;
    const tenantId = tenant.tenantId;
    const currentUserId = tenant.userId;
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Get existing request within tenant
    const existing = await db.leaveRequest.findFirst({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
    }

    // Admin or HR access can delete requests (or owner if draft/pending)
    const isOwner = existing.memberId === currentUserId;
    const hasFullAccess = tenant?.isOwner || tenant?.isAdmin || tenant?.hasHRAccess;

    if (!hasFullAccess && (!isOwner || existing.status !== 'PENDING')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Delete in transaction
    await db.$transaction(async (tx) => {
      // If pending, restore balance
      if (existing.status === 'PENDING') {
        const year = existing.startDate.getFullYear();
        await tx.leaveBalance.update({
          where: {
            tenantId_memberId_leaveTypeId_year: {
              tenantId,
              memberId: existing.memberId,
              leaveTypeId: existing.leaveTypeId,
              year,
            },
          },
          data: {
            pending: {
              decrement: Number(existing.totalDays),
            },
          },
        });
      }

      // Delete the request (this will cascade delete history)
      await tx.leaveRequest.delete({
        where: { id },
      });
    });

    // STORAGE-003: Clean up associated document from storage
    if (existing.documentUrl) {
      await cleanupStorageFile(existing.documentUrl, tenantId);
    }

    await logAction(
      tenantId,
      currentUserId,
      ActivityActions.LEAVE_REQUEST_DELETED,
      'LeaveRequest',
      id,
      { requestNumber: existing.requestNumber }
    );

    return NextResponse.json({ success: true });
}

export const DELETE = withErrorHandler(deleteLeaveRequestHandler, { requireAuth: true, requireModule: 'leave' });
