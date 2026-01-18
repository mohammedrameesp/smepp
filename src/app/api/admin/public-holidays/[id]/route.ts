import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { updatePublicHolidaySchema } from '@/features/leave/validations/leave';

/**
 * GET /api/admin/public-holidays/[id]
 * Get a single public holiday by ID
 */
async function getPublicHolidayHandler(request: NextRequest, context: APIContext) {
  const { tenant, prisma: tenantPrisma } = context;
  const id = context.params?.id;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  if (!id) {
    return NextResponse.json({ error: 'Holiday ID is required' }, { status: 400 });
  }

  const db = tenantPrisma as TenantPrismaClient;

  const holiday = await db.publicHoliday.findUnique({
    where: { id },
  });

  if (!holiday) {
    return NextResponse.json({ error: 'Holiday not found' }, { status: 404 });
  }

  return NextResponse.json(holiday);
}

/**
 * PATCH /api/admin/public-holidays/[id]
 * Update a public holiday
 */
async function updatePublicHolidayHandler(request: NextRequest, context: APIContext) {
  const { tenant, prisma: tenantPrisma } = context;
  const id = context.params?.id;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  if (!id) {
    return NextResponse.json({ error: 'Holiday ID is required' }, { status: 400 });
  }

  const db = tenantPrisma as TenantPrismaClient;
  const body = await request.json();

  // Validate request body
  const data = updatePublicHolidaySchema.parse(body);

  // Check if holiday exists
  const existing = await db.publicHoliday.findUnique({
    where: { id },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Holiday not found' }, { status: 404 });
  }

  // Check for duplicate name/year if name or year is being changed
  if (data.name || data.year) {
    const checkName = data.name || existing.name;
    const checkYear = data.year || existing.year;

    const duplicate = await db.publicHoliday.findFirst({
      where: {
        name: checkName,
        year: checkYear,
        id: { not: id },
      },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: `A holiday named "${checkName}" already exists for year ${checkYear}` },
        { status: 409 }
      );
    }
  }

  // Build update data
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
  if (data.endDate !== undefined) updateData.endDate = new Date(data.endDate);
  if (data.year !== undefined) updateData.year = data.year;
  if (data.isRecurring !== undefined) updateData.isRecurring = data.isRecurring;
  if (data.color !== undefined) updateData.color = data.color;

  const holiday = await db.publicHoliday.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(holiday);
}

/**
 * DELETE /api/admin/public-holidays/[id]
 * Delete a public holiday
 */
async function deletePublicHolidayHandler(request: NextRequest, context: APIContext) {
  const { tenant, prisma: tenantPrisma } = context;
  const id = context.params?.id;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  if (!id) {
    return NextResponse.json({ error: 'Holiday ID is required' }, { status: 400 });
  }

  const db = tenantPrisma as TenantPrismaClient;

  // Check if holiday exists
  const existing = await db.publicHoliday.findUnique({
    where: { id },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Holiday not found' }, { status: 404 });
  }

  await db.publicHoliday.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}

export const GET = withErrorHandler(getPublicHolidayHandler, { requireAuth: true });
export const PATCH = withErrorHandler(updatePublicHolidayHandler, { requireAuth: true, requireAdmin: true });
export const DELETE = withErrorHandler(deletePublicHolidayHandler, { requireAuth: true, requireAdmin: true });
