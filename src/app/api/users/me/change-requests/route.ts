/**
 * @file route.ts
 * @description Profile change requests for employees (self-service)
 * @module system/users
 *
 * NOTE: This endpoint now uses TeamMember (memberId) instead of the deprecated HRProfile.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { z } from 'zod';
import { sendBatchEmails } from '@/lib/core/email';
import { changeRequestEmail } from '@/lib/core/email-templates';
import { TeamMemberRole } from '@prisma/client';

const createRequestSchema = z.object({
  description: z.string().min(10, 'Please provide at least 10 characters describing your change request'),
});

// GET /api/users/me/change-requests - Get current user's change requests
async function getChangeRequestsHandler(request: NextRequest, context: APIContext) {
  const { tenant, prisma: tenantPrisma } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
  }

  const db = tenantPrisma as TenantPrismaClient;

  // Get change requests for this TeamMember (tenant-scoped via extension)
  const requests = await db.profileChangeRequest.findMany({
    where: { memberId: tenant.userId },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ requests });
}

export const GET = withErrorHandler(getChangeRequestsHandler, { requireAuth: true });

// POST /api/users/me/change-requests - Create a new change request
async function createChangeRequestHandler(request: NextRequest, context: APIContext) {
  const { tenant, prisma: tenantPrisma } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
  }

  const db = tenantPrisma as TenantPrismaClient;

  const body = await request.json();
  const validation = createRequestSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: validation.error.issues },
      { status: 400 }
    );
  }

  // Verify TeamMember exists in this tenant (tenant-scoped via extension)
  const member = await db.teamMember.findFirst({
    where: {
      id: tenant.userId,
    },
    select: { id: true, name: true, email: true },
  });

  if (!member) {
    return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
  }

  // Check for existing pending request (tenant-scoped via extension)
  const existingPending = await db.profileChangeRequest.findFirst({
    where: {
      memberId: tenant.userId,
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
  // Note: tenantId is included explicitly for type safety; the tenant prisma
  // extension also auto-injects it but TypeScript requires it at compile time
  const changeRequest = await db.profileChangeRequest.create({
    data: {
      tenantId: tenant.tenantId,
      memberId: tenant.userId,
      description: validation.data.description,
    },
  });

  // Send email notification to all admins in the same organization (non-blocking)
  try {
    // Get org details for email
    const org = await prisma.organization.findUnique({
      where: { id: tenant.tenantId },
      select: { slug: true, name: true, primaryColor: true },
    });

    // Get admin TeamMembers in this organization (tenant-scoped via extension)
    const admins = await db.teamMember.findMany({
      where: {
        role: TeamMemberRole.ADMIN,
        isDeleted: false,
        id: { not: tenant.userId }, // Don't notify the user themselves
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
        primaryColor: org?.primaryColor || undefined,
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
