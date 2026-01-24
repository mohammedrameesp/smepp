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
import { invalidBodyResponse } from '@/lib/http/responses';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { z } from 'zod';
import { sendBatchEmails } from '@/lib/core/email';
import { handleEmailFailure } from '@/lib/core/email-failure-handler';
import { changeRequestEmail } from '@/lib/core/email-templates';
import logger from '@/lib/core/log';

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
    return invalidBodyResponse(validation.error);
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
  // Get org details for email
  const org = await prisma.organization.findUnique({
    where: { id: tenant.tenantId },
    select: { slug: true, name: true, primaryColor: true },
  });
  const orgSlug = org?.slug || 'app';
  const orgName = org?.name || 'Organization';

  // Get admin TeamMembers in this organization (tenant-scoped via extension)
  const admins = await db.teamMember.findMany({
    where: {
      isAdmin: true,
      isDeleted: false,
      id: { not: tenant.userId }, // Don't notify the user themselves
    },
    select: { id: true, email: true, name: true },
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
      orgSlug,
      orgName,
      primaryColor: org?.primaryColor || undefined,
    });

    const emailsToSend = admins.map((admin) => ({
      to: admin.email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    }));

    try {
      const result = await sendBatchEmails(emailsToSend);

      // Check if any emails failed and notify super admin
      if (!result.success && result.results.some(r => 'success' in r && !r.success)) {
        const failedAdmins = admins.filter((_, i) => 'success' in result.results[i] && !result.results[i].success);
        for (const admin of failedAdmins) {
          await handleEmailFailure({
            module: 'hr',
            action: 'change-request-notification',
            tenantId: tenant.tenantId,
            organizationName: orgName,
            organizationSlug: orgSlug,
            recipientEmail: admin.email,
            recipientName: admin.name || admin.email,
            emailSubject: emailContent.subject,
            error: 'Batch email failed',
            metadata: {
              changeRequestId: changeRequest.id,
              employeeName: member.name,
            },
          }).catch(() => {}); // Non-blocking
        }
      }
    } catch (emailError) {
      logger.error({ error: String(emailError), userId: tenant.userId }, 'Failed to send change request notification');

      // Notify super admin about the failure
      await handleEmailFailure({
        module: 'hr',
        action: 'change-request-notification',
        tenantId: tenant.tenantId,
        organizationName: orgName,
        organizationSlug: orgSlug,
        recipientEmail: 'admins@' + orgSlug,
        recipientName: 'Organization Admins',
        emailSubject: emailContent.subject,
        error: emailError instanceof Error ? emailError.message : String(emailError),
        metadata: {
          changeRequestId: changeRequest.id,
          employeeName: member.name,
          adminCount: admins.length,
        },
      }).catch(() => {}); // Non-blocking
    }
  }

  return NextResponse.json({
    message: 'Change request submitted successfully',
    request: changeRequest,
  });
}

export const POST = withErrorHandler(createChangeRequestHandler, { requireAuth: true, rateLimit: true });
