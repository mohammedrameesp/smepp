/**
 * @file route.ts
 * @description Leave type detail operations - get, update, delete individual leave types
 * @module hr/leave
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { updateLeaveTypeSchema } from '@/lib/validations/leave';
import { logAction, ActivityActions } from '@/lib/activity';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

async function getLeaveTypeHandler(request: NextRequest, context: APIContext) {
    const { tenant, params } = context;
    const tenantId = tenant!.tenantId;
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Use findFirst with tenantId to prevent IDOR attacks
    const leaveType = await prisma.leaveType.findFirst({
      where: { id, tenantId },
      include: {
        _count: {
          select: {
            leaveRequests: true,
            leaveBalances: true,
          },
        },
      },
    });

    if (!leaveType) {
      return NextResponse.json({ error: 'Leave type not found' }, { status: 404 });
    }

    return NextResponse.json(leaveType);
}

export const GET = withErrorHandler(getLeaveTypeHandler, { requireAuth: true, requireModule: 'leave' });

async function updateLeaveTypeHandler(request: NextRequest, context: APIContext) {
    const { tenant, params } = context;
    const tenantId = tenant!.tenantId;
    const currentUserId = tenant!.userId;
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const validation = updateLeaveTypeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: validation.error.issues,
      }, { status: 400 });
    }

    const data = validation.data;

    // Check if leave type exists within tenant
    const existing = await prisma.leaveType.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Leave type not found' }, { status: 404 });
    }

    // If name is being changed, check for duplicates within tenant
    if (data.name && data.name !== existing.name) {
      const duplicate = await prisma.leaveType.findFirst({
        where: { name: data.name, tenantId },
      });

      if (duplicate) {
        return NextResponse.json({
          error: 'A leave type with this name already exists',
        }, { status: 400 });
      }
    }

    // Handle JSON fields properly - convert null to undefined for Prisma
    const updateData = {
      ...data,
      serviceBasedEntitlement: data.serviceBasedEntitlement === null ? undefined : data.serviceBasedEntitlement,
      payTiers: data.payTiers === null ? undefined : data.payTiers,
    };

    const leaveType = await prisma.leaveType.update({
      where: { id },
      data: updateData,
    });

    await logAction(
      tenantId,
      currentUserId,
      ActivityActions.LEAVE_TYPE_UPDATED,
      'LeaveType',
      leaveType.id,
      { name: leaveType.name, changes: data }
    );

    return NextResponse.json(leaveType);
}

export const PUT = withErrorHandler(updateLeaveTypeHandler, { requireAdmin: true, requireModule: 'leave' });

async function deleteLeaveTypeHandler(request: NextRequest, context: APIContext) {
    const { tenant, params } = context;
    const tenantId = tenant!.tenantId;
    const currentUserId = tenant!.userId;
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Check if leave type exists within tenant and has no associated requests
    const leaveType = await prisma.leaveType.findFirst({
      where: { id, tenantId },
      include: {
        _count: {
          select: {
            leaveRequests: true,
          },
        },
      },
    });

    if (!leaveType) {
      return NextResponse.json({ error: 'Leave type not found' }, { status: 404 });
    }

    if (leaveType._count.leaveRequests > 0) {
      return NextResponse.json({
        error: 'Cannot delete leave type with existing requests. Consider deactivating it instead.',
      }, { status: 400 });
    }

    await prisma.leaveType.delete({
      where: { id },
    });

    await logAction(
      tenantId,
      currentUserId,
      ActivityActions.LEAVE_TYPE_DELETED,
      'LeaveType',
      id,
      { name: leaveType.name }
    );

    return NextResponse.json({ success: true });
}

export const DELETE = withErrorHandler(deleteLeaveTypeHandler, { requireAdmin: true, requireModule: 'leave' });
