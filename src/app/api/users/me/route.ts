/**
 * @file route.ts
 * @description Current user profile endpoints (self-service)
 * @module system/users
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { z } from 'zod';

const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters').optional(),
  image: z.string().url('Invalid image URL').optional().nullable(),
});

// GET /api/users/me - Get current user profile
async function getCurrentUserHandler(request: NextRequest, context: APIContext) {
  const { tenant, prisma: tenantPrisma } = context;

  // For /me endpoint, we allow access without tenant (for super admins)
  // but users with tenant context get their TeamMember data
  if (tenant?.tenantId) {
    const db = tenantPrisma as TenantPrismaClient;
    // First try to get TeamMember (for org users) - tenant-scoped via extension
    const member = await db.teamMember.findFirst({
      where: {
        id: tenant.userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        isAdmin: true,
        isEmployee: true,
        isOnWps: true,
        dateOfJoining: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            assets: true,
            subscriptions: true,
          },
        },
      },
    });

    if (member) {
      return NextResponse.json({
        ...member,
        isSystemAccount: false,
        hrProfile: member.dateOfJoining ? { dateOfJoining: member.dateOfJoining } : null,
      });
    }
  }

  // Fall back to User model for super admins or users without tenant context
  const user = await prisma.user.findUnique({
    where: { id: tenant?.userId || '' },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      isSystemAccount: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({
    ...user,
    isEmployee: false,
    isOnWps: false,
    hrProfile: null,
    _count: { assets: 0, subscriptions: 0 }, // Super admins don't have assigned assets
  });
}

export const GET = withErrorHandler(getCurrentUserHandler, { requireAuth: true, requireTenant: false });

// PATCH /api/users/me - Update current user profile
async function updateCurrentUserHandler(request: NextRequest, context: APIContext) {
  const { tenant, prisma: tenantPrisma } = context;

  const body = await request.json();
  const validation = updateProfileSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      {
        error: 'Invalid request body',
        details: validation.error.issues,
      },
      { status: 400 }
    );
  }

  const data = validation.data;

  let updatedUser;

  // Check if user is a TeamMember (org user) or User (super admin)
  if (tenant?.tenantId) {
    const db = tenantPrisma as TenantPrismaClient;
    const existingMember = await db.teamMember.findFirst({
      where: {
        id: tenant.userId,
      },
      select: { id: true },
    });

    if (existingMember) {
      // Update TeamMember profile (tenant-scoped via extension)
      const member = await db.teamMember.update({
        where: { id: tenant.userId },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.image !== undefined && { image: data.image }),
        },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          isAdmin: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      updatedUser = { ...member, isSystemAccount: false };

      // Log activity
      await logAction(
        tenant.tenantId,
        tenant.userId,
        ActivityActions.USER_UPDATED,
        'TeamMember',
        updatedUser.id,
        { changes: data }
      );

      return NextResponse.json({
        user: updatedUser,
        message: 'Profile updated successfully',
      });
    }
  }

  // Fall back to User model (for super admins)
  const user = await prisma.user.update({
    where: { id: tenant?.userId || '' },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.image !== undefined && { image: data.image }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      isSystemAccount: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  updatedUser = user;

  return NextResponse.json({
    user: updatedUser,
    message: 'Profile updated successfully',
  });
}

export const PATCH = withErrorHandler(updateCurrentUserHandler, { requireAuth: true, requireTenant: false });
