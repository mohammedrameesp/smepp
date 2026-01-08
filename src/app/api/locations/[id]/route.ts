/**
 * @file route.ts
 * @description Location API - Individual location operations
 * @module api/locations/[id]
 *
 * FEATURES:
 * - Get single location
 * - Update location
 * - Delete location (soft delete via isActive)
 *
 * SECURITY:
 * - Auth required
 * - Admin role required for update/delete
 * - All queries are tenant-scoped
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { updateLocationSchema } from '@/features/locations';

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/locations/[id] - Get single location
// ═══════════════════════════════════════════════════════════════════════════════

async function getHandler(request: NextRequest, context: APIContext) {
  const { prisma, tenant, params } = context;
  const tenantId = tenant!.tenantId;
  const { id } = await params!;

  const location = await prisma.location.findFirst({
    where: { id, tenantId },
    include: {
      _count: {
        select: { assets: true },
      },
    },
  });

  if (!location) {
    return NextResponse.json({ error: 'Location not found' }, { status: 404 });
  }

  return NextResponse.json({
    location: {
      id: location.id,
      name: location.name,
      description: location.description,
      isActive: location.isActive,
      assetsCount: location._count.assets,
      createdAt: location.createdAt,
      updatedAt: location.updatedAt,
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUT /api/locations/[id] - Update location
// ═══════════════════════════════════════════════════════════════════════════════

async function putHandler(request: NextRequest, context: APIContext) {
  const { prisma, tenant, params } = context;
  const tenantId = tenant!.tenantId;
  const { id } = await params!;

  // Check location exists
  const existing = await prisma.location.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Location not found' }, { status: 404 });
  }

  const body = await request.json();
  const validation = updateLocationSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: validation.error.issues },
      { status: 400 }
    );
  }

  const { name, description, isActive } = validation.data;

  // If name is changing, check for duplicates
  if (name && name !== existing.name) {
    const duplicate = await prisma.location.findFirst({
      where: { tenantId, name, id: { not: id } },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: `Location "${name}" already exists` },
        { status: 400 }
      );
    }
  }

  const location = await prisma.location.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(isActive !== undefined && { isActive }),
    },
  });

  return NextResponse.json({
    message: 'Location updated successfully',
    location: {
      id: location.id,
      name: location.name,
      description: location.description,
      isActive: location.isActive,
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE /api/locations/[id] - Delete location
// ═══════════════════════════════════════════════════════════════════════════════

async function deleteHandler(request: NextRequest, context: APIContext) {
  const { prisma, tenant, params } = context;
  const tenantId = tenant!.tenantId;
  const { id } = await params!;

  const location = await prisma.location.findFirst({
    where: { id, tenantId },
    include: {
      _count: {
        select: { assets: true },
      },
    },
  });

  if (!location) {
    return NextResponse.json({ error: 'Location not found' }, { status: 404 });
  }

  // Prevent deletion if assets are assigned
  if (location._count.assets > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete location with ${location._count.assets} assigned asset(s). Please reassign or remove assets first, or deactivate the location instead.`,
      },
      { status: 400 }
    );
  }

  await prisma.location.delete({
    where: { id },
  });

  return NextResponse.json({
    message: 'Location deleted successfully',
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export const GET = withErrorHandler(getHandler, { requireAuth: true });
export const PUT = withErrorHandler(putHandler, { requireAdmin: true });
export const DELETE = withErrorHandler(deleteHandler, { requireAdmin: true });
