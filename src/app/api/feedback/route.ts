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
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const validation = feedbackSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { type, message, screenshotUrl, pageUrl, userAgent } = validation.data;

    // Get organization name if user has one
    let organizationName: string | null = null;
    if (session.user.organizationId) {
      const org = await prisma.organization.findUnique({
        where: { id: session.user.organizationId },
        select: { name: true },
      });
      organizationName = org?.name || null;
    }

    const feedback = await prisma.feedback.create({
      data: {
        type,
        message,
        screenshotUrl: screenshotUrl || null,
        pageUrl: pageUrl || null,
        userAgent: userAgent || null,
        organizationId: session.user.organizationId || null,
        organizationName,
        submittedByEmail: session.user.email,
        submittedByName: session.user.name || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Feedback submitted successfully',
      id: feedback.id,
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error submitting feedback');
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 });
  }
}

/**
 * GET /api/feedback - List all feedback
 * Super-admin only
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user is super admin
    if (!session.user.isSuperAdmin) {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
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
