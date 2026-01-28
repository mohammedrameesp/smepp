/**
 * @file route.ts
 * @description Leave balance detail operations - get and adjust individual balances
 * @module hr/leave
 */

import { NextRequest, NextResponse } from 'next/server';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { updateLeaveBalanceSchema } from '@/features/leave/validations/leave';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { buildManagerAccessFilter, canAccessMember } from '@/lib/access-control/manager-filter';

async function getLeaveBalanceHandler(request: NextRequest, context: APIContext) {
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
    const balance = await db.leaveBalance.findFirst({
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
            isPaid: true,
          },
        },
      },
    });

    if (!balance) {
      return NextResponse.json({ error: 'Leave balance not found' }, { status: 404 });
    }

    // Check access permissions using centralized helper
    const accessFilter = await buildManagerAccessFilter(db, tenant, { domain: 'hr' });
    if (!canAccessMember(accessFilter, balance.memberId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json(balance);
}

export const GET = withErrorHandler(getLeaveBalanceHandler, { requireAuth: true, requireModule: 'leave' });

async function updateLeaveBalanceHandler(request: NextRequest, context: APIContext) {
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
    const validation = updateLeaveBalanceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: validation.error.issues,
      }, { status: 400 });
    }

    const { adjustment, adjustmentNotes } = validation.data;

    // Check if balance exists within tenant
    const existing = await db.leaveBalance.findFirst({
      where: { id },
      include: {
        member: {
          select: { name: true },
        },
        leaveType: {
          select: { name: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Leave balance not found' }, { status: 404 });
    }

    // Calculate new adjustment (add to existing adjustment)
    const newAdjustment = Number(existing.adjustment) + adjustment;

    // Validate that resulting balance won't be negative
    const resultingBalance = Number(existing.entitlement) +
      Number(existing.carriedForward) +
      newAdjustment -
      Number(existing.used) -
      Number(existing.pending);

    if (resultingBalance < 0) {
      return NextResponse.json({
        error: `Adjustment would result in negative balance (${resultingBalance.toFixed(1)} days). Current available: ${(Number(existing.entitlement) + Number(existing.carriedForward) + Number(existing.adjustment) - Number(existing.used) - Number(existing.pending)).toFixed(1)} days`,
      }, { status: 400 });
    }

    const balance = await db.leaveBalance.update({
      where: { id },
      data: {
        adjustment: newAdjustment,
        adjustmentNotes: adjustmentNotes
          ? `${existing.adjustmentNotes ? existing.adjustmentNotes + '\n' : ''}${new Date().toISOString().split('T')[0]}: ${adjustment > 0 ? '+' : ''}${adjustment} days - ${adjustmentNotes}`
          : existing.adjustmentNotes,
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

    await logAction(
      tenantId,
      currentUserId,
      ActivityActions.LEAVE_BALANCE_ADJUSTED,
      'LeaveBalance',
      balance.id,
      {
        memberId: balance.memberId,
        memberName: existing.member?.name,
        leaveTypeName: existing.leaveType?.name,
        adjustment,
        notes: adjustmentNotes,
      }
    );

    return NextResponse.json(balance);
}

export const PUT = withErrorHandler(updateLeaveBalanceHandler, { requireAdmin: true, requireModule: 'leave' });
