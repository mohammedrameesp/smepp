/**
 * @module api/admin/public-holidays/[id]
 * @description Admin API for CRUD operations on individual public holidays.
 *
 * Provides endpoints to view, update, and delete specific public holidays
 * identified by their unique ID.
 *
 * @endpoints
 * - GET /api/admin/public-holidays/[id] - Get a single holiday
 * - PATCH /api/admin/public-holidays/[id] - Update a holiday (admin only)
 * - DELETE /api/admin/public-holidays/[id] - Delete a holiday (admin only)
 *
 * @pathParams
 * - id: The public holiday ID
 *
 * @validation
 * - Duplicate name/year combinations are prevented
 * - All date fields are validated
 *
 * @security
 * - GET: Requires authenticated user
 * - PATCH/DELETE: Requires admin role
 */
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

/*
 * ═══════════════════════════════════════════════════════════════════════════
 * CODE REVIEW SUMMARY
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * File: src/app/api/admin/public-holidays/[id]/route.ts
 * Reviewed: 2026-02-01
 *
 * FUNCTIONALITY: [PASS]
 * - GET: Retrieves single holiday by ID
 * - PATCH: Updates holiday with partial data
 * - DELETE: Removes holiday from system
 * - Duplicate prevention on name+year during updates
 *
 * SECURITY: [PASS]
 * - GET allows any authenticated user
 * - PATCH/DELETE require admin role
 * - Uses tenant-scoped Prisma client
 * - Validates request body with Zod schema
 *
 * VALIDATION: [PASS]
 * - ID parameter validated (required)
 * - Body validated with updatePublicHolidaySchema
 * - Cross-checks for duplicate name/year excluding self
 *
 * ERROR HANDLING: [PASS]
 * - 400 for missing ID parameter
 * - 404 for non-existent holiday
 * - 409 for duplicate name+year combination
 * - 403 for missing tenant context
 *
 * IMPROVEMENTS:
 * - Consider soft delete to preserve history
 * - Add check if holiday is in use (leave calculations)
 * - Consider warning before deleting past holidays
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */
