/**
 * @file route.ts
 * @description Feedback detail API endpoints
 * @module api/feedback/[id]
 *
 * GET - Get feedback detail (super-admin only)
 * PATCH - Update feedback status/notes (super-admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { z } from 'zod';

// Validation schema for updating feedback
const updateFeedbackSchema = z.object({
  status: z.enum(['NEW', 'REVIEWED', 'IN_PROGRESS', 'DONE', 'WONT_FIX']).optional(),
  adminNotes: z.string().max(5000).optional().nullable(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/feedback/[id] - Get feedback detail
 * Super-admin only
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (!session.user.isSuperAdmin) {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const { id } = await params;

    const feedback = await prisma.feedback.findUnique({
      where: { id },
    });

    if (!feedback) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
    }

    return NextResponse.json(feedback);
  } catch (error) {
    console.error('Error fetching feedback:', error);
    return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 });
  }
}

/**
 * PATCH /api/feedback/[id] - Update feedback status/notes
 * Super-admin only
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (!session.user.isSuperAdmin) {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const validation = updateFeedbackSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.issues },
        { status: 400 }
      );
    }

    const feedback = await prisma.feedback.findUnique({
      where: { id },
    });

    if (!feedback) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
    }

    const updated = await prisma.feedback.update({
      where: { id },
      data: {
        ...(validation.data.status && { status: validation.data.status }),
        ...(validation.data.adminNotes !== undefined && { adminNotes: validation.data.adminNotes }),
      },
    });

    return NextResponse.json({
      success: true,
      feedback: updated,
    });
  } catch (error) {
    console.error('Error updating feedback:', error);
    return NextResponse.json({ error: 'Failed to update feedback' }, { status: 500 });
  }
}
