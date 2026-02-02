/**
 * @module api/organizations/[id]/code-formats
 * @description Manages organization-specific code format patterns for entity identifiers.
 *
 * Code formats define how entity codes (employee IDs, asset tags, etc.) are generated.
 * Supports custom patterns with placeholders for dynamic values.
 *
 * @authentication Required - Session-based
 * @authorization GET: Any organization member | PUT: Admin or Owner only
 *
 * @example
 * GET /api/organizations/abc123/code-formats
 *
 * PUT /api/organizations/abc123/code-formats
 * {
 *   "formats": {
 *     "employees": "EMP-{YYYY}-{SEQ:4}",
 *     "assets": "AST-{SEQ:5}"
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import logger from '@/lib/core/log';
import { clearPrefixCache, validateFormatPattern, type CodeFormatConfig } from '@/lib/utils/code-prefix';
import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

const codeFormatsSchema = z.object({
  formats: z.object({
    employees: z.string().optional(),
    assets: z.string().optional(),
    loans: z.string().optional(),
    'spend-requests': z.string().optional(),
    'asset-requests': z.string().optional(),
    'leave-requests': z.string().optional(),
    'payroll-runs': z.string().optional(),
    suppliers: z.string().optional(),
  }),
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/organizations/[id]/code-formats - Get code formats
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
        codePrefix: true,
        codeFormats: true,
      },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    return NextResponse.json({
      codePrefix: organization.codePrefix,
      codeFormats: organization.codeFormats as CodeFormatConfig,
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Get code formats error');
    return NextResponse.json({ error: 'Failed to get code formats' }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUT /api/organizations/[id]/code-formats - Update code formats
// ═══════════════════════════════════════════════════════════════════════════════

export async function PUT(
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
      return NextResponse.json({ error: 'Only admins can update code formats' }, { status: 403 });
    }

    const body = await request.json();
    const result = codeFormatsSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { formats } = result.data;

    // Validate each format pattern
    for (const [key, pattern] of Object.entries(formats)) {
      if (pattern) {
        const validation = validateFormatPattern(pattern);
        if (!validation.valid) {
          return NextResponse.json(
            { error: `Invalid format for ${key}: ${validation.error}` },
            { status: 400 }
          );
        }
      }
    }

    // Update organization
    const organization = await prisma.organization.update({
      where: { id },
      data: {
        codeFormats: formats,
      },
      select: {
        codePrefix: true,
        codeFormats: true,
      },
    });

    // Clear the cache to apply new formats
    clearPrefixCache(id);

    return NextResponse.json({
      success: true,
      codePrefix: organization.codePrefix,
      codeFormats: organization.codeFormats,
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Update code formats error');
    return NextResponse.json({ error: 'Failed to update code formats' }, { status: 500 });
  }
}

/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * CODE REVIEW SUMMARY
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * STRENGTHS:
 * - Proper authentication and authorization checks
 * - Zod validation for input data
 * - Pattern validation before database update
 * - Cache invalidation after format changes
 * - Consistent error handling pattern
 *
 * CONCERNS:
 * - Uses raw getServerSession instead of withErrorHandler pattern
 * - Membership lookup queries by id instead of using session.user.organizationId
 * - No audit logging for configuration changes
 * - PUT should possibly be PATCH (partial update semantics)
 *
 * RECOMMENDATIONS:
 * - Migrate to withErrorHandler for consistency with other endpoints
 * - Add audit logging for admin configuration changes
 * - Consider rate limiting to prevent cache thrashing
 * - Add TypeScript type for formats object keys
 *
 * SECURITY NOTES:
 * - Proper tenant isolation via membership check
 * - Admin/Owner authorization enforced for writes
 * - Format patterns are validated before storage
 */
