import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { z } from 'zod';
import crypto from 'crypto';

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/super-admin/admins - List all super admins
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const superAdmins = await prisma.user.findMany({
      where: { isSuperAdmin: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        twoFactorEnabled: true,
        createdAt: true,
        emailVerified: true,
      },
    });

    return NextResponse.json({ superAdmins });
  } catch (error) {
    console.error('Get super admins error:', error);
    return NextResponse.json(
      { error: 'Failed to get super admins' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/super-admin/admins - Invite a new super admin
// ═══════════════════════════════════════════════════════════════════════════════

const inviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { email, name } = inviteSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      if (existingUser.isSuperAdmin) {
        return NextResponse.json(
          { error: 'This user is already a super admin' },
          { status: 400 }
        );
      }

      // Promote existing user to super admin
      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: { isSuperAdmin: true },
        select: {
          id: true,
          name: true,
          email: true,
          isSuperAdmin: true,
        },
      });

      return NextResponse.json({
        message: 'User promoted to super admin',
        user: updatedUser,
        isNewUser: false,
      });
    }

    // Create new super admin user with temporary password
    const tempPassword = crypto.randomBytes(16).toString('hex');
    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const newUser = await prisma.user.create({
      data: {
        email,
        name: name || email.split('@')[0],
        passwordHash,
        isSuperAdmin: true,
        emailVerified: new Date(), // Mark as verified since we're creating directly
      },
      select: {
        id: true,
        name: true,
        email: true,
        isSuperAdmin: true,
      },
    });

    // TODO: Send email with temporary password or setup link
    // For now, we'll return the temp password (in production, send via email)

    return NextResponse.json({
      message: 'Super admin created successfully',
      user: newUser,
      isNewUser: true,
      // In production, remove this and send via email
      tempPassword: process.env.NODE_ENV === 'development' ? tempPassword : undefined,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error('Create super admin error:', error);
    return NextResponse.json(
      { error: 'Failed to create super admin' },
      { status: 500 }
    );
  }
}
