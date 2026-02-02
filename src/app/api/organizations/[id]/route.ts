/**
 * @module api/organizations/[id]
 * @description Core organization management endpoint for viewing and updating tenant settings.
 *
 * Provides organization details including subscription info, member counts, and
 * branding settings. Supports updating name, logo, primary color, and code prefix.
 *
 * @authentication Required - Session-based
 * @authorization GET: Any organization member | PATCH: Admin or Owner only
 *
 * @example
 * GET /api/organizations/abc123
 *
 * PATCH /api/organizations/abc123
 * {
 *   "name": "New Company Name",
 *   "primaryColor": "#3B82F6",
 *   "codePrefix": "ACM"
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import logger from '@/lib/core/log';
import { clearPrefixCache, isCodePrefixAvailable } from '@/lib/utils/code-prefix';
import { z } from 'zod';
import { deriveOrgRole } from '@/lib/access-control';

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

const updateOrgSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  logoUrl: z.string().url().nullable().optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  codePrefix: z.string().min(2).max(3).regex(/^[A-Z0-9]{2,3}$/).optional(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/organizations/[id] - Get organization details
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;

    // Verify user is a member of this organization
    const membership = await prisma.teamMember.findFirst({
      where: {
        tenantId: id,
        id: session.user.id,
        isDeleted: false,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this organization' }, { status: 403 });
    }

    const organization = await prisma.organization.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        primaryColor: true,
        subscriptionTier: true,
        maxUsers: true,
        maxAssets: true,
        stripeCustomerId: true,
        stripeSubEnd: true,
        createdAt: true,
        _count: {
          select: {
            teamMembers: true,
          },
        },
      },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    return NextResponse.json({
      organization,
      membership: {
        role: deriveOrgRole(membership),
        isOwner: membership.isOwner,
      },
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Get organization error');
    return NextResponse.json({ error: 'Failed to get organization' }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /api/organizations/[id] - Update organization
// ═══════════════════════════════════════════════════════════════════════════════

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;

    // Verify user is an admin or owner
    const membership = await prisma.teamMember.findFirst({
      where: {
        tenantId: id,
        id: session.user.id,
        isDeleted: false,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this organization' }, { status: 403 });
    }

    if (!membership.isOwner && !membership.isAdmin) {
      return NextResponse.json({ error: 'Only admins can update organization settings' }, { status: 403 });
    }

    const body = await request.json();
    const result = updateOrgSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { codePrefix, ...restData } = result.data;

    // If codePrefix is being updated, check uniqueness
    if (codePrefix) {
      const isAvailable = await isCodePrefixAvailable(codePrefix, id);
      if (!isAvailable) {
        return NextResponse.json(
          { error: 'This code prefix is already in use by another organization' },
          { status: 400 }
        );
      }
    }

    const organization = await prisma.organization.update({
      where: { id },
      data: {
        ...restData,
        ...(codePrefix && { codePrefix }),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        primaryColor: true,
        codePrefix: true,
      },
    });

    // Clear the prefix cache if codePrefix was updated
    if (codePrefix) {
      clearPrefixCache(id);
    }

    return NextResponse.json({ success: true, organization });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Update organization error');
    return NextResponse.json({ error: 'Failed to update organization' }, { status: 500 });
  }
}

/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * CODE REVIEW SUMMARY
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * STRENGTHS:
 * - Proper authentication and authorization checks
 * - Zod validation with specific patterns (hex color, 2-3 char prefix)
 * - Code prefix uniqueness validation before update
 * - Cache invalidation after prefix changes
 * - Returns derived orgRole for frontend use
 *
 * CONCERNS:
 * - Uses raw getServerSession instead of withErrorHandler pattern
 * - GET includes Stripe subscription data without explicit permission check
 * - No audit logging for organization setting changes
 * - teamMembers count includes all members (should filter isDeleted?)
 *
 * RECOMMENDATIONS:
 * - Migrate to withErrorHandler for consistency
 * - Add audit logging for configuration changes
 * - Filter deleted members from count
 * - Consider adding DELETE method with proper ownership transfer flow
 * - Add rate limiting to prevent cache thrashing
 *
 * SECURITY NOTES:
 * - Proper tenant isolation via membership check
 * - Admin/Owner authorization for writes
 * - Code prefix validated and uniqueness enforced
 */
