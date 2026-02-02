/**
 * @module api/admin/change-requests/[id]
 * @description Admin API for viewing and resolving individual profile change requests.
 *
 * Provides operations to get details of a specific change request and
 * resolve it by approving or rejecting with optional notes.
 *
 * @endpoints
 * - GET /api/admin/change-requests/[id] - Get a single change request
 * - PATCH /api/admin/change-requests/[id] - Resolve a change request
 *
 * @pathParams
 * - id: The change request ID
 *
 * @requestBody (PATCH)
 * - status: 'APPROVED' | 'REJECTED'
 * - notes: Optional resolver notes
 *
 * @security Requires admin authentication and tenant context
 */
import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { invalidBodyResponse } from '@/lib/http/responses';
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
    return invalidBodyResponse(validation.error);
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

/*
 * ═══════════════════════════════════════════════════════════════════════════
 * CODE REVIEW SUMMARY
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * File: src/app/api/admin/change-requests/[id]/route.ts
 * Reviewed: 2026-02-01
 *
 * FUNCTIONALITY: [PASS]
 * - GET: Retrieves single change request with member details
 * - PATCH: Resolves request (approve/reject) with optional notes
 * - Records resolver ID and timestamp
 * - Prevents re-resolving already processed requests
 *
 * SECURITY: [PASS]
 * - Requires admin authentication for both endpoints
 * - Uses tenant-scoped Prisma (auto-filters by tenantId)
 * - Validates request body with Zod schema
 * - Uses findFirst (not findUnique) for tenant-safe lookups
 *
 * VALIDATION: [PASS]
 * - Zod schema enforces status enum (APPROVED/REJECTED)
 * - Notes field is optional string
 * - Returns 400 for already-resolved requests
 *
 * ERROR HANDLING: [PASS]
 * - 403 for missing tenant context
 * - 404 for non-existent request
 * - 400 for invalid body or already resolved
 * - Wrapped with global error handler
 *
 * IMPROVEMENTS:
 * - Consider adding activity log entry for resolution
 * - Could notify employee when request is resolved
 * - Add audit trail for who resolved and when
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */
