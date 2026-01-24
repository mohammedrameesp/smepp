/**
 * @file route.ts
 * @description Feedback API endpoints
 * @module api/feedback
 *
 * POST - Submit feedback (any authenticated user)
 * GET - List all feedback (super-admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import logger from '@/lib/core/log';
import { z } from 'zod';
import { withErrorHandler } from '@/lib/http/handler';
import { validationErrorResponse, forbiddenResponse } from '@/lib/http/errors';

// Validation schema for feedback submission
const feedbackSchema = z.object({
  type: z.enum(['BUG', 'FEATURE_REQUEST']),
  message: z.string().min(10, 'Message must be at least 10 characters').max(5000),
  screenshotUrl: z.string().url().optional().nullable(),
  pageUrl: z.string().optional(),
  userAgent: z.string().optional(),
});

/**
 * POST /api/feedback - Submit feedback
 * Available to any authenticated user
 */
export const POST = withErrorHandler(async (request: NextRequest, { tenant }) => {
  const body = await request.json();
  const validation = feedbackSchema.safeParse(body);

  if (!validation.success) {
    return validationErrorResponse(validation);
  }

  const { type, message, screenshotUrl, pageUrl, userAgent } = validation.data;

  // Get organization name if user has one
  let organizationName: string | null = null;
  const organizationId = tenant?.tenantId || null;

  if (organizationId) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });
    organizationName = org?.name || null;
  }

  // Get user email from session for feedback attribution
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email || 'unknown';
  const userName = session?.user?.name || null;

  const feedback = await prisma.feedback.create({
    data: {
      type,
      message,
      screenshotUrl: screenshotUrl || null,
      pageUrl: pageUrl || null,
      userAgent: userAgent || null,
      organizationId,
      organizationName,
      submittedByEmail: userEmail,
      submittedByName: userName,
    },
  });

  return NextResponse.json({
    success: true,
    message: 'Feedback submitted successfully',
    id: feedback.id,
  });
}, { requireAuth: true, requireTenant: false });

/**
 * GET /api/feedback - List all feedback
 * Super-admin only (handled manually since withErrorHandler doesn't support requireSuperAdmin)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user is super admin
    if (!session.user.isSuperAdmin) {
      return forbiddenResponse('Super admin access required');
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: Record<string, string> = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const [feedback, total] = await Promise.all([
      prisma.feedback.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Math.min(limit, 100),
        skip: offset,
      }),
      prisma.feedback.count({ where }),
    ]);

    return NextResponse.json({
      feedback,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + feedback.length < total,
      },
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error fetching feedback');
    return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 });
  }
}
