import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { z } from 'zod';

const resolveSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  notes: z.string().optional(),
});

// PATCH /api/admin/change-requests/[id] - Resolve a change request
async function resolveChangeRequestHandler(
  request: NextRequest,
  context: { params?: Record<string, string> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.teamMemberRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  // Require organization context for tenant isolation
  if (!session.user.organizationId) {
    return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
  }

  const tenantId = session.user.organizationId;
  const id = context.params?.id;
  const body = await request.json();
  const validation = resolveSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: validation.error.issues },
      { status: 400 }
    );
  }

  // Find the change request within tenant
  const changeRequest = await prisma.profileChangeRequest.findFirst({
    where: { id, tenantId },
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
  const updated = await prisma.profileChangeRequest.update({
    where: { id },
    data: {
      status: validation.data.status,
      resolvedById: session.user.id,
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
  context: { params?: Record<string, string> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.teamMemberRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  // Require organization context for tenant isolation
  if (!session.user.organizationId) {
    return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
  }

  const tenantId = session.user.organizationId;
  const id = context.params?.id;

  const changeRequest = await prisma.profileChangeRequest.findFirst({
    where: { id, tenantId },
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
