/**
 * @module api/admin/team/[memberId]
 * @description Team member management endpoints for updating permissions and removing
 * members. Supports both the new boolean-based permission system and legacy role field
 * for backwards compatibility. Handles WhatsApp verification prompts on permission changes.
 *
 * @endpoints
 * - PATCH /api/admin/team/[memberId] - Update member permissions (owner only)
 * - DELETE /api/admin/team/[memberId] - Remove member from organization (soft delete)
 *
 * @security
 * - PATCH: Requires authentication + owner role for permission changes
 * - DELETE: Requires authentication + admin role, only owners can remove admins
 * - Validates member belongs to tenant organization
 * - Prevents self-modification and owner removal
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { z } from 'zod';
import { TeamMemberStatus } from '@prisma/client';
import { clearWhatsAppPromptSnooze } from '@/lib/utils/whatsapp-verification-check';
import { withErrorHandler } from '@/lib/http/handler';
import { validationErrorResponse, notFoundResponse, forbiddenResponse, badRequestResponse } from '@/lib/http/errors';
import { deriveOrgRole } from '@/lib/access-control';

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /api/admin/team/[memberId] - Update member permissions
// ═══════════════════════════════════════════════════════════════════════════════

const updateMemberSchema = z.object({
  // New boolean-based permission system
  isAdmin: z.boolean().optional(),
  hasOperationsAccess: z.boolean().optional(),
  hasHRAccess: z.boolean().optional(),
  hasFinanceAccess: z.boolean().optional(),
  canApprove: z.boolean().optional(),
  // Legacy role field for backwards compatibility
  role: z.enum(['ADMIN', 'MEMBER']).optional(),
});

export const PATCH = withErrorHandler(async (
  request: NextRequest,
  { tenant, params }
) => {
  const tenantId = tenant!.tenantId;
  const userId = tenant!.userId;
  const memberId = params?.memberId;

  if (!memberId) {
    return badRequestResponse('Member ID is required');
  }

  // Only owners can change roles
  if (!tenant!.isOwner) {
    return forbiddenResponse('Owner access required');
  }
  const body = await request.json();
  const result = updateMemberSchema.safeParse(body);

  if (!result.success) {
    return validationErrorResponse(result);
  }

  // Check member exists and belongs to org
  const member = await prisma.teamMember.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      tenantId: true,
      isAdmin: true,
      canApprove: true,
    },
  });

  if (!member || member.tenantId !== tenantId) {
    return notFoundResponse('Member');
  }

  // Can't change own permissions
  if (member.id === userId) {
    return badRequestResponse('Cannot change your own permissions');
  }

  // Build update data from new boolean fields or legacy role
  const updateData: {
    isAdmin?: boolean;
    hasOperationsAccess?: boolean;
    hasHRAccess?: boolean;
    hasFinanceAccess?: boolean;
    canApprove?: boolean;
    permissionsUpdatedAt?: Date;
  } = {};

  // If legacy role is provided, map to isAdmin
  if (result.data.role !== undefined) {
    updateData.isAdmin = result.data.role === 'ADMIN';
  }
  // Otherwise, use the new boolean fields if provided
  if (result.data.isAdmin !== undefined) updateData.isAdmin = result.data.isAdmin;
  if (result.data.hasOperationsAccess !== undefined) updateData.hasOperationsAccess = result.data.hasOperationsAccess;
  if (result.data.hasHRAccess !== undefined) updateData.hasHRAccess = result.data.hasHRAccess;
  if (result.data.hasFinanceAccess !== undefined) updateData.hasFinanceAccess = result.data.hasFinanceAccess;
  if (result.data.canApprove !== undefined) updateData.canApprove = result.data.canApprove;

  // Set permissionsUpdatedAt if any permission field is being updated
  if (Object.keys(updateData).length > 0) {
    updateData.permissionsUpdatedAt = new Date();
  }

  // Check if member is being promoted to an eligible role for WhatsApp verification
  const wasEligible = member.isAdmin || member.canApprove;
  const willBeAdmin = updateData.isAdmin ?? member.isAdmin;
  const willCanApprove = updateData.canApprove ?? member.canApprove;
  const willBeEligible = willBeAdmin || willCanApprove;
  const isBeingPromoted = !wasEligible && willBeEligible;

  // Update permissions
  const updated = await prisma.teamMember.update({
    where: { id: memberId },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      isAdmin: true,
      hasOperationsAccess: true,
      hasHRAccess: true,
      hasFinanceAccess: true,
      canApprove: true,
      isOwner: true,
    },
  });

  // If user is being promoted to an eligible role, check if org has WhatsApp enabled
  // and clear their snooze so they'll be prompted to verify their number
  if (isBeingPromoted) {
    const org = await prisma.organization.findUnique({
      where: { id: tenantId },
      select: { whatsAppSource: true },
    });

    if (org && org.whatsAppSource !== 'NONE') {
      // Check if user is already verified
      const whatsAppPhone = await prisma.whatsAppUserPhone.findUnique({
        where: { memberId },
        select: { isVerified: true },
      });

      if (!whatsAppPhone?.isVerified) {
        // Clear snooze so they'll see the prompt on next login
        await clearWhatsAppPromptSnooze(memberId);
      }
    }
  }

  return NextResponse.json({
    member: {
      ...updated,
      // Legacy role field for backwards compatibility
      role: deriveOrgRole(updated),
    },
  });
}, { requireAuth: true });

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE /api/admin/team/[memberId] - Remove member from organization
// ═══════════════════════════════════════════════════════════════════════════════

export const DELETE = withErrorHandler(async (
  _request: NextRequest,
  { tenant, params }
) => {
  const tenantId = tenant!.tenantId;
  const userId = tenant!.userId;
  const isOwner = tenant!.isOwner;
  const memberId = params?.memberId;

  if (!memberId) {
    return badRequestResponse('Member ID is required');
  }

  // Check member exists and belongs to org
  const member = await prisma.teamMember.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      name: true,
      email: true,
      tenantId: true,
      isAdmin: true,
      isOwner: true,
    },
  });

  if (!member || member.tenantId !== tenantId) {
    return notFoundResponse('Member');
  }

  // Can't remove yourself
  if (member.id === userId) {
    return badRequestResponse('Cannot remove yourself from the organization');
  }

  // Can't remove the owner
  if (member.isOwner) {
    return badRequestResponse('Cannot remove the organization owner');
  }

  // Admins can't remove other admins (only owners can)
  if (!isOwner && member.isAdmin) {
    return forbiddenResponse('Only owners can remove admins');
  }

  // Soft delete member (mark as terminated)
  await prisma.teamMember.update({
    where: { id: memberId },
    data: {
      status: TeamMemberStatus.TERMINATED,
      isDeleted: true,
      deletedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true });
}, { requireAuth: true, requireAdmin: true });

/*
 * =============================================================================
 * CODE REVIEW SUMMARY
 * =============================================================================
 *
 * Purpose:
 * Core team member management - permission updates and member removal. Implements
 * role-based access control with owner-only permission changes and proper
 * deletion restrictions.
 *
 * Strengths:
 * - Owner-only permission changes prevent privilege escalation
 * - Prevents self-modification (can't change own permissions or remove self)
 * - Protects organization owner from removal
 * - Admins can only remove members, not other admins (hierarchy enforcement)
 * - Soft delete preserves audit trail (isDeleted, deletedAt, TERMINATED status)
 * - Zod validation for request body
 * - Backwards compatibility with legacy role field
 * - WhatsApp verification prompt handling on permission promotion
 * - Updates permissionsUpdatedAt for tracking changes
 *
 * Concerns:
 * - [LOW] PATCH requires owner but DELETE requires admin - inconsistent naming
 *   (requireAdmin option doesn't enforce owner, manual check does)
 * - [LOW] No audit logging of permission changes
 *
 * Recommendations:
 * - Add audit logging for permission changes and member removals
 * - Consider adding notification to removed member
 *
 * Status: APPROVED - Well-secured with proper access control hierarchy
 * Last Reviewed: 2026-02-01
 * =============================================================================
 */
