import { NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { withErrorHandler } from '@/lib/http/handler';

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/admin/team/invitations - Get pending invitations
// ═══════════════════════════════════════════════════════════════════════════════

export const GET = withErrorHandler(async (_request, { tenant }) => {
  const tenantId = tenant!.tenantId;

  const invitations = await prisma.organizationInvitation.findMany({
    where: {
      organizationId: tenantId,
      acceptedAt: null,
    },
    orderBy: { createdAt: 'desc' },
  });

  const now = new Date();
  return NextResponse.json({
    invitations: invitations.map((inv) => ({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      expiresAt: inv.expiresAt,
      createdAt: inv.createdAt,
      isExpired: inv.expiresAt < now,
      isEmployee: inv.isEmployee ?? true, // Default to true for backwards compatibility
    })),
  });
}, { requireAuth: true, requireAdmin: true });
