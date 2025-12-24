import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { logAction, ActivityActions } from '@/lib/activity';
import { hrProfileSchema } from '@/lib/validations/hr-profile';
import { Role } from '@prisma/client';
import { reinitializeUserLeaveBalances } from '@/lib/leave-balance-init';

// GET /api/users/[id]/hr-profile - Get a user's HR profile (admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Only admins can view other users' HR profiles
    if (session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;

    // Find the user
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find or create HR profile
    let hrProfile = await prisma.hRProfile.findUnique({
      where: { userId: id },
    });

    // Create empty profile if none exists
    if (!hrProfile) {
      hrProfile = await prisma.hRProfile.create({
        data: {
          userId: id,
          tenantId: session.user.organizationId!,
        },
      });
    }

    return NextResponse.json({
      ...hrProfile,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      workEmail: user.email,
      isAdmin: true, // Admin is viewing
    });
  } catch (error) {
    console.error('Get HR Profile error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch HR profile' },
      { status: 500 }
    );
  }
}

// PATCH /api/users/[id]/hr-profile - Update a user's HR profile (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Only admins can edit other users' HR profiles
    if (session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const validation = hrProfileSchema.safeParse(body);

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

    // Convert date strings to Date objects for Prisma
    const processedData: Record<string, unknown> = { ...data };

    // Remove fields that shouldn't be persisted (passed through from frontend)
    const fieldsToRemove = ['id', 'userId', 'workEmail', 'isAdmin', 'createdAt', 'updatedAt', 'user'];
    fieldsToRemove.forEach((field) => {
      delete processedData[field];
    });

    const dateFields = [
      'dateOfBirth',
      'qidExpiry',
      'passportExpiry',
      'healthCardExpiry',
      'dateOfJoining',
      'licenseExpiry',
    ];

    dateFields.forEach((field) => {
      const value = processedData[field];
      if (value && typeof value === 'string') {
        processedData[field] = new Date(value);
      } else if (value === '' || value === null) {
        processedData[field] = null;
      }
    });

    // Upsert HR profile
    const hrProfile = await prisma.hRProfile.upsert({
      where: { userId: id },
      update: processedData,
      create: {
        userId: id,
        ...processedData,
        tenantId: session.user.organizationId!,
      },
    });

    // Log activity
    await logAction(
      session.user.id,
      ActivityActions.USER_UPDATED,
      'HRProfile',
      hrProfile.id,
      {
        targetUserId: id,
        targetUserEmail: user.email,
        changes: Object.keys(data),
      }
    );

    // If dateOfJoining was updated, reinitialize leave balances
    if ('dateOfJoining' in data) {
      try {
        await reinitializeUserLeaveBalances(id);
      } catch (leaveError) {
        console.error('[Leave] Failed to reinitialize leave balances:', leaveError);
        // Don't fail the request if leave balance reinitialization fails
      }
    }

    return NextResponse.json({
      ...hrProfile,
      message: 'HR Profile updated successfully',
    });
  } catch (error) {
    console.error('Update HR Profile error:', error);
    return NextResponse.json(
      { error: 'Failed to update HR profile' },
      { status: 500 }
    );
  }
}
