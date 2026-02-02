/**
 * @file route.ts
 * @description API endpoint for fetching pending organization invitations
 * @module api/invitations/pending
 *
 * Returns all pending (non-expired, non-accepted) invitations for the
 * currently authenticated user's email address.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import logger from '@/lib/core/log';

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/invitations/pending - Get pending invitations for current user
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/invitations/pending
 *
 * Returns all pending invitations for the authenticated user's email.
 * Invitations must be:
 * - Not yet accepted (acceptedAt is null)
 * - Not expired (expiresAt > now)
 *
 * @returns {Object[]} invitations - Array of pending invitation objects
 */
export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Find all pending invitations for this email
    const invitations = await prisma.organizationInvitation.findMany({
      where: {
        email: session.user.email.toLowerCase(),
        acceptedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      invitations: invitations.map((inv) => ({
        id: inv.id,
        token: inv.token,
        email: inv.email,
        role: inv.role,
        organization: inv.organization,
        expiresAt: inv.expiresAt,
        createdAt: inv.createdAt,
      })),
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to get pending invitations');
    return NextResponse.json(
      { error: 'Failed to get pending invitations' },
      { status: 500 }
    );
  }
}

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes:
 *   - Added JSDoc module documentation at top
 *   - Added return type annotation (Promise<NextResponse>)
 *   - Added detailed JSDoc for GET handler
 * Issues: None - Uses session-based email lookup (not tenant-scoped, which is correct
 *   since invitations are fetched by email before user joins an organization)
 */
