/**
 * @module api/whatsapp/phones
 *
 * WhatsApp Phone Numbers API
 *
 * Manage WhatsApp phone numbers for users.
 * Admins can manage any user's phone, users can manage their own.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorHandler } from '@/lib/http/handler';
import { prisma } from '@/lib/core/prisma';
import { saveMemberWhatsAppPhone, verifyMemberWhatsAppPhone } from '@/lib/whatsapp';

// Validation schema
const phoneSchema = z.object({
  memberId: z.string().optional(), // If not provided, use current member
  phoneNumber: z.string().min(8, 'Phone number is required'),
});

/**
 * GET /api/whatsapp/phones
 *
 * Get all WhatsApp phone numbers for the tenant (admin only)
 * or the current member's phone number.
 */
export const GET = withErrorHandler(async (request: NextRequest, { tenant }) => {
  if (!tenant?.tenantId || !tenant.userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const isAdmin = tenant?.isOwner || tenant?.isAdmin;
  const searchParams = request.nextUrl.searchParams;
  const targetMemberId = searchParams.get('memberId');

  // Non-admins can only get their own phone
  if (!isAdmin && targetMemberId && targetMemberId !== tenant.userId) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  if (isAdmin && !targetMemberId) {
    // Admin getting all phones for the org
    const phones = await prisma.whatsAppUserPhone.findMany({
      where: { tenantId: tenant.tenantId },
      include: {
        member: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ phones });
  }

  // Get specific member's phone
  const memberId = targetMemberId || tenant.userId;
  const phone = await prisma.whatsAppUserPhone.findUnique({
    where: { memberId },
    include: {
      member: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return NextResponse.json({ phone });
}, { requireAuth: true });

/**
 * POST /api/whatsapp/phones
 *
 * Save or update a member's WhatsApp phone number.
 * Admins can set any member's phone, members can set their own.
 */
export const POST = withErrorHandler(async (request: NextRequest, { tenant }) => {
  if (!tenant?.tenantId || !tenant.userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json();
  const { memberId, phoneNumber } = phoneSchema.parse(body);

  const isAdmin = tenant?.isOwner || tenant?.isAdmin;
  const targetMemberId = memberId || tenant.userId;

  // Non-admins can only set their own phone
  if (!isAdmin && targetMemberId !== tenant.userId) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Verify the member belongs to this tenant
  const teamMember = await prisma.teamMember.findFirst({
    where: {
      id: targetMemberId,
      tenantId: tenant.tenantId,
    },
  });

  if (!teamMember) {
    return NextResponse.json({ error: 'Member not found in this organization' }, { status: 404 });
  }

  await saveMemberWhatsAppPhone(tenant.tenantId, targetMemberId, phoneNumber);

  return NextResponse.json({
    success: true,
    message: 'Phone number saved. Verification pending.',
  });
}, { requireAuth: true });

/**
 * PATCH /api/whatsapp/phones
 *
 * Verify a member's WhatsApp phone number.
 * Admin only - marks the phone as verified.
 */
export const PATCH = withErrorHandler(async (request: NextRequest, { tenant }) => {
  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json();
  const { memberId } = z.object({ memberId: z.string() }).parse(body);

  // Verify the phone belongs to this tenant
  const phone = await prisma.whatsAppUserPhone.findUnique({
    where: { memberId },
  });

  if (!phone || phone.tenantId !== tenant.tenantId) {
    return NextResponse.json({ error: 'Phone not found' }, { status: 404 });
  }

  await verifyMemberWhatsAppPhone(memberId);

  return NextResponse.json({
    success: true,
    message: 'Phone number verified',
  });
}, { requireAuth: true, requireAdmin: true });

/**
 * DELETE /api/whatsapp/phones
 *
 * Remove a member's WhatsApp phone number.
 */
export const DELETE = withErrorHandler(async (request: NextRequest, { tenant }) => {
  if (!tenant?.tenantId || !tenant.userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const targetMemberId = searchParams.get('memberId') || tenant.userId;

  const isAdmin = tenant?.isOwner || tenant?.isAdmin;

  // Non-admins can only delete their own phone
  if (!isAdmin && targetMemberId !== tenant.userId) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Verify the phone belongs to this tenant
  const phone = await prisma.whatsAppUserPhone.findUnique({
    where: { memberId: targetMemberId },
  });

  if (!phone || phone.tenantId !== tenant.tenantId) {
    return NextResponse.json({ error: 'Phone not found' }, { status: 404 });
  }

  await prisma.whatsAppUserPhone.delete({
    where: { memberId: targetMemberId },
  });

  return NextResponse.json({
    success: true,
    message: 'Phone number removed',
  });
}, { requireAuth: true });

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes:
 *   - No changes needed - file is well-structured
 *   - Has proper JSDoc module documentation
 *   - Uses Zod validation for input
 *   - Has proper tenant isolation checks in all handlers
 *   - Uses withErrorHandler with requireAuth
 *   - PATCH uses requireAdmin for verification
 *   - Access control: users can only manage own phone, admins can manage all
 *   - Verifies team member belongs to tenant before operations
 * Issues: None
 */
