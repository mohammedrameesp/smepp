/**
 * @file route.ts
 * @description Locations API - CRUD operations for tenant-scoped locations
 * @module api/locations
 *
 * FEATURES:
 * - List locations for current organization
 * - Create new locations
 *
 * SECURITY:
 * - Auth required
 * - Admin role required for create
 * - All queries are tenant-scoped
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { invalidBodyResponse } from '@/lib/http/responses';
import { createLocationSchema } from '@/features/locations';

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/locations - List locations
// ═══════════════════════════════════════════════════════════════════════════════

async function getHandler(_request: NextRequest, context: APIContext) {
  const { prisma, tenant } = context;
  const tenantId = tenant!.tenantId;

  const locations = await prisma.location.findMany({
    where: { tenantId },
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { assets: true },
      },
    },
  });

  return NextResponse.json({
    locations: locations.map((loc) => ({
      id: loc.id,
      name: loc.name,
      description: loc.description,
      assetsCount: loc._count.assets,
    })),
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/locations - Create location
// ═══════════════════════════════════════════════════════════════════════════════

async function postHandler(request: NextRequest, context: APIContext) {
  const { prisma, tenant } = context;
  const tenantId = tenant!.tenantId;

  const body = await request.json();
  const validation = createLocationSchema.safeParse(body);

  if (!validation.success) {
    return invalidBodyResponse(validation.error);
  }

  const { name, description } = validation.data;

  // Check if name already exists for this tenant
  const existing = await prisma.location.findFirst({
    where: { tenantId, name },
  });

  if (existing) {
    return NextResponse.json(
      { error: `Location "${name}" already exists` },
      { status: 400 }
    );
  }

  const location = await prisma.location.create({
    data: {
      tenantId,
      name,
      description,
    },
  });

  return NextResponse.json(
    {
      message: 'Location created successfully',
      location: {
        id: location.id,
        name: location.name,
        description: location.description,
      },
    },
    { status: 201 }
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export const GET = withErrorHandler(getHandler, { requireAuth: true });
export const POST = withErrorHandler(postHandler, { requireAdmin: true });
