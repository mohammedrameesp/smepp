/**
 * @file route.ts
 * @description Leave balance CRUD operations - list and initialize leave balances
 * @module hr/leave
 */

import { NextRequest, NextResponse } from 'next/server';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { leaveBalanceQuerySchema, initializeLeaveBalanceSchema } from '@/features/leave/validations/leave';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { getCurrentYear } from '@/features/leave/lib/leave-utils';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { buildManagerAccessFilter, applyManagerFilter } from '@/lib/access-control/manager-filter';

async function getLeaveBalancesHandler(request: NextRequest, context: APIContext) {
    const { tenant, prisma: tenantPrisma } = context;
    if (!tenant?.tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }
    const db = tenantPrisma as TenantPrismaClient;

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const validation = leaveBalanceQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid query parameters',
        details: validation.error.issues,
      }, { status: 400 });
    }

    const { memberId, leaveTypeId, year, p, ps } = validation.data;

    // Build access filter using centralized helper (handles admin/HR, manager, and regular user access)
    const accessFilter = await buildManagerAccessFilter(db, tenant, {
      domain: 'hr',
      requestedMemberId: memberId,
    });

    // Build where clause with access filter (tenant filtering is automatic via db)
    const where: Record<string, unknown> = applyManagerFilter(accessFilter);
    if (leaveTypeId) {
      where.leaveTypeId = leaveTypeId;
    }
    if (year) {
      where.year = year;
    } else {
      // Default to current year
      where.year = getCurrentYear();
    }

    const skip = (p - 1) * ps;

    const [balances, total] = await Promise.all([
      db.leaveBalance.findMany({
        where,
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
              accrualBased: true,
            },
          },
        },
        orderBy: [
          { member: { name: 'asc' } },
          { leaveType: { name: 'asc' } },
        ],
        take: ps,
        skip,
      }),
      db.leaveBalance.count({ where }),
    ]);

    return NextResponse.json({
      balances,
      pagination: {
        page: p,
        pageSize: ps,
        total,
        totalPages: Math.ceil(total / ps),
        hasMore: skip + ps < total,
      },
    });
}

export const GET = withErrorHandler(getLeaveBalancesHandler, { requireAuth: true, requireModule: 'leave' });

async function createLeaveBalanceHandler(request: NextRequest, context: APIContext) {
    const { tenant, prisma: tenantPrisma } = context;
    if (!tenant?.tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }
    const db = tenantPrisma as TenantPrismaClient;
    const tenantId = tenant.tenantId;
    const currentUserId = tenant.userId;

    const body = await request.json();
    const validation = initializeLeaveBalanceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: validation.error.issues,
      }, { status: 400 });
    }

    const { memberId, leaveTypeId, year, entitlement, carriedForward } = validation.data;

    // Check if team member exists, belongs to this tenant, and is an employee
    const teamMember = await db.teamMember.findFirst({
      where: {
        id: memberId,
        isEmployee: true,
        isDeleted: false,
      },
    });

    if (!teamMember) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Check if leave type exists and belongs to this tenant
    const leaveType = await db.leaveType.findFirst({
      where: { id: leaveTypeId },
    });

    if (!leaveType) {
      return NextResponse.json({ error: 'Leave type not found' }, { status: 404 });
    }

    // Check if balance already exists for this member/type/year
    const existing = await db.leaveBalance.findFirst({
      where: {
        memberId,
        leaveTypeId,
        year,
      },
    });

    if (existing) {
      return NextResponse.json({
        error: 'Balance already exists for this member, leave type, and year',
      }, { status: 400 });
    }

    // Note: tenantId is included explicitly for type safety; the tenant prisma
    // extension also auto-injects it but TypeScript requires it at compile time
    const balance = await db.leaveBalance.create({
      data: {
        tenantId,
        memberId,
        leaveTypeId,
        year,
        entitlement: entitlement ?? leaveType.defaultDays,
        carriedForward: carriedForward ?? 0,
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
      ActivityActions.LEAVE_BALANCE_CREATED,
      'LeaveBalance',
      balance.id,
      { memberId, leaveTypeId, year, entitlement: balance.entitlement }
    );

    return NextResponse.json(balance, { status: 201 });
}

export const POST = withErrorHandler(createLeaveBalanceHandler, { requireAdmin: true, requireModule: 'leave' });

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes: Added review summary
 * Issues: None identified
 */
