/**
 * @file route.ts
 * @description Profile change requests for employees (self-service)
 * @module system/users
 *
 * NOTE: This endpoint now uses TeamMember (memberId) instead of the deprecated HRProfile.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { z } from 'zod';
import { sendBatchEmails } from '@/lib/core/email';
import { changeRequestEmail } from '@/lib/core/email-templates';
import { TeamMemberRole } from '@prisma/client';

const createRequestSchema = z.object({
  description: z.string().min(10, 'Please provide at least 10 characters describing your change request'),
});

// GET /api/users/me/change-requests - Get current user's change requests
async function getChangeRequestsHandler(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // Require organization context for tenant isolation
  if (!session.user.organizationId) {
    return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
  }

  const tenantId = session.user.organizationId;

  // Get change requests for this TeamMember
  const requests = await prisma.profileChangeRequest.findMany({
    where: { memberId: session.user.id, tenantId },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ requests });
}

export const GET = withErrorHandler(getChangeRequestsHandler, { requireAuth: true });

// POST /api/users/me/change-requests - Create a new change request
async function createChangeRequestHandler(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const body = await request.json();
  const validation = createRequestSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: validation.error.issues },
      { status: 400 }
    );
  }

  // Require organization context for tenant isolation
  if (!session.user.organizationId) {
    return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
  }

  const tenantId = session.user.organizationId;

  // Verify TeamMember exists
  const member = await prisma.teamMember.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true },
  });

  if (!member) {
    return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
  }

  // Check for existing pending request
  const existingPending = await prisma.profileChangeRequest.findFirst({
    where: {
      memberId: session.user.id,
      status: 'PENDING',
    },
  });

  if (existingPending) {
    return NextResponse.json(
      { error: 'You already have a pending change request. Please wait for it to be resolved.' },
      { status: 400 }
    );
  }

  // Create the change request (using memberId, not hrProfileId)
  const changeRequest = await prisma.profileChangeRequest.create({
    data: {
      memberId: session.user.id,
      description: validation.data.description,
      tenantId,
    },
  });

  // Send email notification to all admins in the same organization (non-blocking)
  try {
    // Get org details for email
    const org = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      select: { slug: true, name: true },
    });

    // Get admin TeamMembers in this organization
    const admins = await prisma.teamMember.findMany({
      where: {
        tenantId: session.user.organizationId!,
        role: TeamMemberRole.ADMIN,
        isDeleted: false,
        id: { not: session.user.id }, // Don't notify the user themselves
      },
      select: { email: true },
    });

    if (admins.length > 0) {
      const emailContent = changeRequestEmail({
        employeeName: member.name || 'Employee',
        employeeEmail: member.email,
        fieldName: 'Profile Information',
        currentValue: '',
        requestedValue: 'See description',
        reason: validation.data.description,
        submittedDate: new Date(),
        orgSlug: org?.slug || 'app',
        orgName: org?.name || 'Organization',
      });

      const emailsToSend = admins.map((admin) => ({
        to: admin.email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      }));

      await sendBatchEmails(emailsToSend);
    }
  } catch (emailError) {
    console.error('[Email] Failed to send change request notification:', emailError);
    // Don't fail the request if email fails
  }

  return NextResponse.json({
    message: 'Change request submitted successfully',
    request: changeRequest,
  });
}

export const POST = withErrorHandler(createChangeRequestHandler, { requireAuth: true, rateLimit: true });
