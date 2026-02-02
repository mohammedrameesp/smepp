/**
 * @module api/admin/team/invitations
 * @description Organization invitation listing endpoint. Returns all pending
 * (non-accepted) invitations for the current tenant with expiration status.
 *
 * @endpoints
 * - GET /api/admin/team/invitations - List pending invitations
 *
 * @security
 * - Requires authentication (requireAuth: true)
 * - Requires admin role (requireAdmin: true)
 * - Queries scoped to tenant organization
 */
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

/*
 * =============================================================================
 * CODE REVIEW SUMMARY
 * =============================================================================
 *
 * Purpose:
 * Lists all pending (non-accepted) organization invitations for the current
 * tenant. Used by admin UI to display outstanding invitations.
 *
 * Strengths:
 * - Clean, focused endpoint with single responsibility
 * - Proper tenant scoping via organizationId
 * - Calculates isExpired status server-side for consistent behavior
 * - Default value for isEmployee ensures backwards compatibility
 * - Results ordered by createdAt desc (newest first)
 *
 * Concerns:
 * - [NONE] Simple, well-implemented listing endpoint
 *
 * Status: APPROVED - Clean read-only listing endpoint
 * Last Reviewed: 2026-02-01
 * =============================================================================
 */
