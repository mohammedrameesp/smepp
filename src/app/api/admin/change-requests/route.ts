import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { Role } from '@prisma/client';

// GET /api/admin/change-requests - Get all change requests (admin only)
async function getChangeRequestsHandler(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'all';

  const where: Record<string, unknown> = {};
  if (status !== 'all') {
    where.status = status.toUpperCase();
  }

  const requests = await prisma.profileChangeRequest.findMany({
    where,
    include: {
      hrProfile: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const stats = {
    total: await prisma.profileChangeRequest.count(),
    pending: await prisma.profileChangeRequest.count({ where: { status: 'PENDING' } }),
    approved: await prisma.profileChangeRequest.count({ where: { status: 'APPROVED' } }),
    rejected: await prisma.profileChangeRequest.count({ where: { status: 'REJECTED' } }),
  };

  return NextResponse.json({ requests, stats });
}

export const GET = withErrorHandler(getChangeRequestsHandler, { requireAuth: true, requireAdmin: true });
