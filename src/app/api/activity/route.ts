import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorHandler } from '@/lib/http/handler';
import { validationErrorResponse } from '@/lib/http/errors';

const querySchema = z.object({
  actor: z.string().optional(),
  entityType: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

export const GET = withErrorHandler(async (request: NextRequest, { prisma, tenant }) => {
  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const queryParams = Object.fromEntries(searchParams.entries());

  const validation = querySchema.safeParse(queryParams);
  if (!validation.success) {
    return validationErrorResponse(validation);
  }

  const { actor, entityType, from, to, limit, offset } = validation.data;

  // Build where clause - tenant filtering handled by prisma extension
  const where: {
    actorMemberId?: string;
    entityType?: string;
    at?: { gte?: Date; lte?: Date };
  } = {};

  if (actor) {
    where.actorMemberId = actor;
  }

  if (entityType) {
    where.entityType = entityType;
  }

  if (from || to) {
    where.at = {};
    if (from) where.at.gte = new Date(from);
    if (to) where.at.lte = new Date(to);
  }

  // Fetch activity logs - tenant isolation automatic via prisma extension
  const [activities, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { at: 'desc' },
      take: limit,
      skip: offset,
      include: {
        actorMember: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
    prisma.activityLog.count({ where }),
  ]);

  return NextResponse.json({
    activities,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    },
  });
}, { requireAuth: true, requireAdmin: true });