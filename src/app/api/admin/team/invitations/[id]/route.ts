import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { randomBytes } from 'crypto';
import { withErrorHandler } from '@/lib/http/handler';
import { notFoundResponse, badRequestResponse } from '@/lib/http/errors';

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/admin/team/invitations/[id] - Resend invitation (regenerate token)
// ═══════════════════════════════════════════════════════════════════════════════

export const POST = withErrorHandler(async (
  _request: NextRequest,
  { tenant, params }
) => {
  const tenantId = tenant!.tenantId;
  const id = params?.id;

  if (!id) {
    return badRequestResponse('Invitation ID is required');
  }

  // Find invitation
  const invitation = await prisma.organizationInvitation.findUnique({
    where: { id },
  });

  if (!invitation || invitation.organizationId !== tenantId) {
    return notFoundResponse('Invitation');
  }

  if (invitation.acceptedAt) {
    return badRequestResponse('This invitation has already been accepted');
  }

  // Regenerate token and extend expiry
  const newToken = randomBytes(32).toString('hex');
  const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // Get org for subdomain-based URL
  const org = await prisma.organization.findUnique({
    where: { id: tenantId },
    select: { slug: true },
  });

  const updated = await prisma.organizationInvitation.update({
    where: { id },
    data: {
      token: newToken,
      expiresAt: newExpiresAt,
    },
  });

  // Build organization-specific invite URL using subdomain (same as create)
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost:3000';
  const protocol = appDomain.includes('localhost') ? 'http' : 'https';
  const inviteUrl = `${protocol}://${org?.slug}.${appDomain}/invite/${newToken}`;

  return NextResponse.json({
    success: true,
    invitation: {
      id: updated.id,
      email: updated.email,
      role: updated.role,
      inviteUrl,
      expiresAt: newExpiresAt.toISOString(),
    },
  });
}, { requireAuth: true, requireAdmin: true });

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE /api/admin/team/invitations/[id] - Cancel invitation
// ═══════════════════════════════════════════════════════════════════════════════

export const DELETE = withErrorHandler(async (
  _request: NextRequest,
  { tenant, params }
) => {
  const tenantId = tenant!.tenantId;
  const id = params?.id;

  if (!id) {
    return badRequestResponse('Invitation ID is required');
  }

  // Find invitation
  const invitation = await prisma.organizationInvitation.findUnique({
    where: { id },
  });

  if (!invitation || invitation.organizationId !== tenantId) {
    return notFoundResponse('Invitation');
  }

  if (invitation.acceptedAt) {
    return badRequestResponse('Cannot cancel an accepted invitation');
  }

  // Delete invitation
  await prisma.organizationInvitation.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}, { requireAuth: true, requireAdmin: true });
