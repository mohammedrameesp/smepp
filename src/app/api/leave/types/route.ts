/**
 * @file route.ts
 * @description Leave type CRUD operations - list and create leave types
 * @module hr/leave
 */

import { NextRequest, NextResponse } from 'next/server';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { createLeaveTypeSchema, leaveTypeQuerySchema } from '@/features/leave/validations/leave';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

async function getLeaveTypesHandler(request: NextRequest, context: APIContext) {
    const { tenant, prisma: tenantPrisma } = context;
    if (!tenant?.tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }
    const db = tenantPrisma as TenantPrismaClient;
    const tenantId = tenant.tenantId;

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const validation = leaveTypeQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid query parameters',
        details: validation.error.issues,
      }, { status: 400 });
    }

    const { isActive, includeInactive } = validation.data;
    const isAdmin = tenant.orgRole === 'OWNER' || tenant.orgRole === 'ADMIN';

    // Build where clause (tenant filtering is automatic via db)
    const where: Record<string, unknown> = {};

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    } else if (includeInactive !== 'true') {
      // By default, only return active leave types
      where.isActive = true;
    }

    let leaveTypes = await db.leaveType.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    // For non-admin users, filter out PARENTAL and RELIGIOUS leave types
    // unless they have an assigned balance for them
    if (!isAdmin) {
      const currentYear = new Date().getFullYear();

      // Look up the current user's TeamMember ID
      const currentMember = await db.teamMember.findFirst({
        where: { id: tenant.userId },
        select: { id: true },
      });

      // Get member's assigned balances for special leave types
      const assignedSpecialBalances = currentMember ? await db.leaveBalance.findMany({
        where: {
          memberId: currentMember.id,
          year: currentYear,
          leaveType: {
            category: { in: ['PARENTAL', 'RELIGIOUS'] },
          },
        },
        select: { leaveTypeId: true },
      }) : [];

      const assignedSpecialLeaveTypeIds = new Set(assignedSpecialBalances.map(b => b.leaveTypeId));

      // Get member's gender from TeamMember for additional filtering
      const memberWithGender = currentMember ? await db.teamMember.findUnique({
        where: { id: currentMember.id },
        select: { gender: true },
      }) : null;
      const userGender = memberWithGender?.gender?.toUpperCase();

      // Filter leave types for employees
      leaveTypes = leaveTypes.filter(lt => {
        // Always show STANDARD and MEDICAL category leave types
        if (lt.category === 'STANDARD' || lt.category === 'MEDICAL') {
          return true;
        }

        // For PARENTAL and RELIGIOUS categories, only show if admin has assigned a balance
        if (lt.category === 'PARENTAL' || lt.category === 'RELIGIOUS') {
          // Must have an assigned balance
          if (!assignedSpecialLeaveTypeIds.has(lt.id)) {
            return false;
          }

          // Additionally check gender restriction matches
          if (lt.genderRestriction && userGender !== lt.genderRestriction) {
            return false;
          }

          return true;
        }

        return true;
      });
    }

    return NextResponse.json({ leaveTypes });
}

export const GET = withErrorHandler(getLeaveTypesHandler, { requireAuth: true, requireModule: 'leave' });

async function createLeaveTypeHandler(request: NextRequest, context: APIContext) {
    const { tenant, prisma: tenantPrisma } = context;
    if (!tenant?.tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }
    const db = tenantPrisma as TenantPrismaClient;
    const tenantId = tenant.tenantId;
    const currentUserId = tenant.userId;

    const body = await request.json();
    const validation = createLeaveTypeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: validation.error.issues,
      }, { status: 400 });
    }

    const data = validation.data;

    // Check if leave type with same name already exists in this tenant
    const existing = await db.leaveType.findFirst({
      where: { name: data.name },
    });

    if (existing) {
      return NextResponse.json({
        error: 'A leave type with this name already exists',
      }, { status: 400 });
    }

    // Handle JSON fields properly - convert null to undefined for Prisma
    // Note: tenantId is included explicitly for type safety; the tenant prisma
    // extension also auto-injects it but TypeScript requires it at compile time
    const createData = {
      tenantId,
      ...data,
      serviceBasedEntitlement: data.serviceBasedEntitlement ?? undefined,
      payTiers: data.payTiers ?? undefined,
    };

    const leaveType = await db.leaveType.create({
      data: createData,
    });

    await logAction(
      tenantId,
      currentUserId,
      ActivityActions.LEAVE_TYPE_CREATED,
      'LeaveType',
      leaveType.id,
      { name: leaveType.name }
    );

    return NextResponse.json(leaveType, { status: 201 });
}

export const POST = withErrorHandler(createLeaveTypeHandler, { requireAdmin: true, requireModule: 'leave' });
