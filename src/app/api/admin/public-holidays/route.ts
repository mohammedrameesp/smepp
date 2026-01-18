import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import {
  createPublicHolidaySchema,
  publicHolidayQuerySchema,
} from '@/features/leave/validations/leave';

/**
 * GET /api/admin/public-holidays
 * List all public holidays for the organization (optionally filtered by year)
 */
async function getPublicHolidaysHandler(request: NextRequest, context: APIContext) {
  const { tenant, prisma: tenantPrisma } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  const db = tenantPrisma as TenantPrismaClient;
  const { searchParams } = new URL(request.url);

  // Parse query parameters
  const query = publicHolidayQuerySchema.parse({
    year: searchParams.get('year') || undefined,
    p: searchParams.get('p') || 1,
    ps: searchParams.get('ps') || 50,
  });

  const where: Record<string, unknown> = {};
  if (query.year) {
    where.year = query.year;
  }

  const [holidays, total] = await Promise.all([
    db.publicHoliday.findMany({
      where,
      orderBy: [{ year: 'desc' }, { startDate: 'asc' }],
      skip: (query.p - 1) * query.ps,
      take: query.ps,
    }),
    db.publicHoliday.count({ where }),
  ]);

  return NextResponse.json({
    data: holidays,
    pagination: {
      page: query.p,
      pageSize: query.ps,
      total,
      totalPages: Math.ceil(total / query.ps),
    },
  });
}

/**
 * POST /api/admin/public-holidays
 * Create a new public holiday
 */
async function createPublicHolidayHandler(request: NextRequest, context: APIContext) {
  const { tenant, prisma: tenantPrisma } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  const db = tenantPrisma as TenantPrismaClient;
  const body = await request.json();

  // Validate request body
  const data = createPublicHolidaySchema.parse(body);

  // Check for duplicate (same name and year)
  const existing = await db.publicHoliday.findFirst({
    where: {
      name: data.name,
      year: data.year,
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: `A holiday named "${data.name}" already exists for year ${data.year}` },
      { status: 409 }
    );
  }

  // Create the holiday
  // Note: tenantId is included explicitly for type safety; the tenant prisma
  // extension also auto-injects it but TypeScript requires it at compile time
  const holiday = await db.publicHoliday.create({
    data: {
      tenantId: tenant.tenantId,
      name: data.name,
      description: data.description,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      year: data.year,
      isRecurring: data.isRecurring,
      color: data.color,
    },
  });

  return NextResponse.json(holiday, { status: 201 });
}

export const GET = withErrorHandler(getPublicHolidaysHandler, { requireAuth: true });
export const POST = withErrorHandler(createPublicHolidayHandler, { requireAuth: true, requireAdmin: true });
