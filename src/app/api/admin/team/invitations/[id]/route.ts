/**
 * @module api/admin/team/invitations/[id]
 * @description Single invitation management endpoints. Supports resending invitations
 * (regenerating tokens and extending expiry) and canceling/deleting pending invitations.
 *
 * @endpoints
 * - POST /api/admin/team/invitations/[id] - Resend invitation with new token
 * - DELETE /api/admin/team/invitations/[id] - Cancel pending invitation
 *
 * @security
 * - Requires authentication (requireAuth: true)
 * - Requires admin role (requireAdmin: true)
 * - Validates invitation belongs to tenant organization
 * - Prevents operations on already-accepted invitations
 */
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

/*
 * =============================================================================
 * CODE REVIEW SUMMARY
 * =============================================================================
 *
 * Purpose:
 * Manages individual invitation lifecycle - resending (with token regeneration)
 * and cancellation. Used when invitations expire or need to be withdrawn.
 *
 * Strengths:
 * - Proper tenant validation (invitation.organizationId !== tenantId)
 * - Prevents operations on already-accepted invitations
 * - Token regeneration using crypto.randomBytes for security
 * - Generates proper subdomain-based invite URLs
 * - 7-day expiration for resent invitations
 *
 * Concerns:
 * - [LOW] POST endpoint for resend does not send actual email - only returns URL
 *   (email sending may be handled elsewhere or be intentional for manual sharing)
 * - [LOW] No rate limiting on resend - could be abused for token generation
 *
 * Recommendations:
 * - Consider adding rate limiting on resend endpoint
 * - Consider logging invitation resend/delete actions for audit trail
 *
 * Status: APPROVED - Proper invitation management with minor enhancement opportunities
 * Last Reviewed: 2026-02-01
 * =============================================================================
 */
