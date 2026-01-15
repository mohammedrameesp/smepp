/**
 * @file route.ts
 * @description Leave exceptions API - manages per-employee leave rule overrides
 * @module hr/leave/exceptions
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { z } from 'zod';

// GET /api/leave/exceptions - List all employees with active exceptions
async function getExceptionsHandler(
  request: NextRequest,
  context: APIContext
) {
  const { tenant, prisma: tenantPrisma } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  const db = tenantPrisma as TenantPrismaClient;

  // Fetch all employees with bypassNoticeRequirement enabled
  const employeesWithExceptions = await db.teamMember.findMany({
    where: {
      isDeleted: false,
      isEmployee: true,
      bypassNoticeRequirement: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      bypassNoticeRequirement: true,
    },
    orderBy: { name: 'asc' },
  });

  // Also get all employees for the "add exception" dropdown
  const allEmployees = await db.teamMember.findMany({
    where: {
      isDeleted: false,
      isEmployee: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      bypassNoticeRequirement: true,
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({
    exceptions: employeesWithExceptions.map(emp => ({
      id: emp.id,
      name: emp.name,
      email: emp.email,
      image: emp.image,
      type: 'BYPASS_NOTICE' as const,
    })),
    employees: allEmployees.map(emp => ({
      id: emp.id,
      name: emp.name || emp.email,
      email: emp.email,
      hasException: emp.bypassNoticeRequirement,
    })),
    total: employeesWithExceptions.length,
  });
}

export const GET = withErrorHandler(getExceptionsHandler, { requireAdmin: true });

const updateExceptionSchema = z.object({
  memberId: z.string(),
  type: z.enum(['BYPASS_NOTICE']),
  enabled: z.boolean(),
});

// POST /api/leave/exceptions - Enable/disable an exception for an employee
async function updateExceptionHandler(
  request: NextRequest,
  context: APIContext
) {
  const { tenant, prisma: tenantPrisma } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  const db = tenantPrisma as TenantPrismaClient;

  const body = await request.json();
  const validation = updateExceptionSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({
      error: 'Invalid request body',
      details: validation.error.issues,
    }, { status: 400 });
  }

  const { memberId, type, enabled } = validation.data;

  // Verify the member exists and is an employee
  const member = await db.teamMember.findFirst({
    where: {
      id: memberId,
      isDeleted: false,
      isEmployee: true,
    },
  });

  if (!member) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
  }

  // Update the exception based on type
  const updateData: Record<string, boolean> = {};

  if (type === 'BYPASS_NOTICE') {
    updateData.bypassNoticeRequirement = enabled;
  }

  const updatedMember = await db.teamMember.update({
    where: { id: memberId },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      bypassNoticeRequirement: true,
    },
  });

  return NextResponse.json({
    success: true,
    member: {
      id: updatedMember.id,
      name: updatedMember.name,
      email: updatedMember.email,
    },
    exception: {
      type,
      enabled,
    },
  });
}

export const POST = withErrorHandler(updateExceptionHandler, { requireAdmin: true });
