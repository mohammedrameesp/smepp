import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { z } from 'zod';

const resolveSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  notes: z.string().optional(),
});

// PATCH /api/admin/change-requests/[id] - Resolve a change request
async function resolveChangeRequestHandler(
  request: NextRequest,
  context: APIContext
) {
  const { tenant, prisma: tenantPrisma } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  const db = tenantPrisma as TenantPrismaClient;
  const id = context.params?.id;
  const body = await request.json();
  const validation = resolveSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: validation.error.issues },
      { status: 400 }
    );
  }

  // Find the change request - tenantId is auto-filtered by tenant-scoped prisma client
  const changeRequest = await db.profileChangeRequest.findFirst({
    where: { id },
    include: {
      member: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!changeRequest) {
    return NextResponse.json({ error: 'Change request not found' }, { status: 404 });
  }

  if (changeRequest.status !== 'PENDING') {
    return NextResponse.json(
      { error: 'This change request has already been resolved' },
      { status: 400 }
    );
  }

  // Update the change request
  const updated = await db.profileChangeRequest.update({
    where: { id },
    data: {
      status: validation.data.status,
      resolvedById: tenant.userId,
      resolvedAt: new Date(),
      resolverNotes: validation.data.notes || null,
    },
  });

  return NextResponse.json({
    message: `Change request ${validation.data.status.toLowerCase()} successfully`,
    request: updated,
  });
}

export const PATCH = withErrorHandler(resolveChangeRequestHandler, { requireAuth: true, requireAdmin: true });

// GET /api/admin/change-requests/[id] - Get a single change request
async function getChangeRequestHandler(
  request: NextRequest,
  context: APIContext
) {
  const { tenant, prisma: tenantPrisma } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  const db = tenantPrisma as TenantPrismaClient;
  const id = context.params?.id;

  // tenantId is auto-filtered by tenant-scoped prisma client
  const changeRequest = await db.profileChangeRequest.findFirst({
    where: { id },
    include: {
      member: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  if (!changeRequest) {
    return NextResponse.json({ error: 'Change request not found' }, { status: 404 });
  }

  return NextResponse.json({ request: changeRequest });
}

export const GET = withErrorHandler(getChangeRequestHandler, { requireAuth: true, requireAdmin: true });
