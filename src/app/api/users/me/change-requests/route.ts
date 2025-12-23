import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { z } from 'zod';
import { sendBatchEmails } from '@/lib/email';
import { changeRequestEmail } from '@/lib/email-templates';
import { Role } from '@prisma/client';

const createRequestSchema = z.object({
  description: z.string().min(10, 'Please provide at least 10 characters describing your change request'),
});

// GET /api/users/me/change-requests - Get current user's change requests
async function getChangeRequestsHandler(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // Find user's HR profile
  const hrProfile = await prisma.hRProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!hrProfile) {
    return NextResponse.json({ requests: [] });
  }

  const requests = await prisma.profileChangeRequest.findMany({
    where: { hrProfileId: hrProfile.id },
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

  // Find or create user's HR profile
  let hrProfile = await prisma.hRProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!hrProfile) {
    hrProfile = await prisma.hRProfile.create({
      data: { userId: session.user.id },
    });
  }

  // Check for existing pending request
  const existingPending = await prisma.profileChangeRequest.findFirst({
    where: {
      hrProfileId: hrProfile.id,
      status: 'PENDING',
    },
  });

  if (existingPending) {
    return NextResponse.json(
      { error: 'You already have a pending change request. Please wait for it to be resolved.' },
      { status: 400 }
    );
  }

  // Create the change request
  const changeRequest = await prisma.profileChangeRequest.create({
    data: {
      hrProfileId: hrProfile.id,
      description: validation.data.description,
    },
  });

  // Send email notification to all admins (non-blocking)
  try {
    const admins = await prisma.user.findMany({
      where: { role: Role.ADMIN },
      select: { email: true },
    });

    if (admins.length > 0) {
      const emailContent = changeRequestEmail({
        employeeName: session.user.name || 'Employee',
        employeeEmail: session.user.email || '',
        fieldName: 'Profile Information',
        currentValue: '',
        requestedValue: 'See description',
        reason: validation.data.description,
        submittedDate: new Date(),
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
