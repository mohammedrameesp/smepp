/**
 * WhatsApp Phone Numbers API
 *
 * Manage WhatsApp phone numbers for users.
 * Admins can manage any user's phone, users can manage their own.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorHandler } from '@/lib/http/handler';
import { prisma } from '@/lib/core/prisma';
import { saveUserWhatsAppPhone, verifyUserWhatsAppPhone } from '@/lib/whatsapp';

// Validation schema
const phoneSchema = z.object({
  userId: z.string().optional(), // If not provided, use current user
  phoneNumber: z.string().min(8, 'Phone number is required'),
});

/**
 * GET /api/whatsapp/phones
 *
 * Get all WhatsApp phone numbers for the tenant (admin only)
 * or the current user's phone number.
 */
export const GET = withErrorHandler(async (request: NextRequest, { tenant }) => {
  if (!tenant?.tenantId || !tenant.userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const isAdmin = tenant.orgRole === 'ADMIN' || tenant.orgRole === 'OWNER';
  const searchParams = request.nextUrl.searchParams;
  const targetUserId = searchParams.get('userId');

  // Non-admins can only get their own phone
  if (!isAdmin && targetUserId && targetUserId !== tenant.userId) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  if (isAdmin && !targetUserId) {
    // Admin getting all phones for the org
    const phones = await prisma.whatsAppUserPhone.findMany({
      where: { tenantId: tenant.tenantId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ phones });
  }

  // Get specific user's phone
  const userId = targetUserId || tenant.userId;
  const phone = await prisma.whatsAppUserPhone.findUnique({
    where: { userId },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return NextResponse.json({ phone });
}, { requireAuth: true });

/**
 * POST /api/whatsapp/phones
 *
 * Save or update a user's WhatsApp phone number.
 * Admins can set any user's phone, users can set their own.
 */
export const POST = withErrorHandler(async (request: NextRequest, { tenant }) => {
  if (!tenant?.tenantId || !tenant.userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json();
  const { userId, phoneNumber } = phoneSchema.parse(body);

  const isAdmin = tenant.orgRole === 'ADMIN' || tenant.orgRole === 'OWNER';
  const targetUserId = userId || tenant.userId;

  // Non-admins can only set their own phone
  if (!isAdmin && targetUserId !== tenant.userId) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Verify the user belongs to this tenant
  const userMembership = await prisma.organizationUser.findUnique({
    where: {
      organizationId_userId: {
        organizationId: tenant.tenantId,
        userId: targetUserId,
      },
    },
  });

  if (!userMembership) {
    return NextResponse.json({ error: 'User not found in this organization' }, { status: 404 });
  }

  await saveUserWhatsAppPhone(tenant.tenantId, targetUserId, phoneNumber);

  return NextResponse.json({
    success: true,
    message: 'Phone number saved. Verification pending.',
  });
}, { requireAuth: true });

/**
 * PATCH /api/whatsapp/phones
 *
 * Verify a user's WhatsApp phone number.
 * Admin only - marks the phone as verified.
 */
export const PATCH = withErrorHandler(async (request: NextRequest, { tenant }) => {
  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json();
  const { userId } = z.object({ userId: z.string() }).parse(body);

  // Verify the phone belongs to this tenant
  const phone = await prisma.whatsAppUserPhone.findUnique({
    where: { userId },
  });

  if (!phone || phone.tenantId !== tenant.tenantId) {
    return NextResponse.json({ error: 'Phone not found' }, { status: 404 });
  }

  await verifyUserWhatsAppPhone(userId);

  return NextResponse.json({
    success: true,
    message: 'Phone number verified',
  });
}, { requireAuth: true, requireAdmin: true });

/**
 * DELETE /api/whatsapp/phones
 *
 * Remove a user's WhatsApp phone number.
 */
export const DELETE = withErrorHandler(async (request: NextRequest, { tenant }) => {
  if (!tenant?.tenantId || !tenant.userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const targetUserId = searchParams.get('userId') || tenant.userId;

  const isAdmin = tenant.orgRole === 'ADMIN' || tenant.orgRole === 'OWNER';

  // Non-admins can only delete their own phone
  if (!isAdmin && targetUserId !== tenant.userId) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Verify the phone belongs to this tenant
  const phone = await prisma.whatsAppUserPhone.findUnique({
    where: { userId: targetUserId },
  });

  if (!phone || phone.tenantId !== tenant.tenantId) {
    return NextResponse.json({ error: 'Phone not found' }, { status: 404 });
  }

  await prisma.whatsAppUserPhone.delete({
    where: { userId: targetUserId },
  });

  return NextResponse.json({
    success: true,
    message: 'Phone number removed',
  });
}, { requireAuth: true });
