import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE /api/super-admin/admins/[id] - Remove super admin privileges
// ═══════════════════════════════════════════════════════════════════════════════

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Prevent removing yourself
    if (id === session.user.id) {
      return NextResponse.json(
        { error: 'You cannot remove your own super admin privileges' },
        { status: 400 }
      );
    }

    // Check if user exists and is a super admin
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.isSuperAdmin) {
      return NextResponse.json(
        { error: 'User is not a super admin' },
        { status: 400 }
      );
    }

    // Check if this is the last super admin
    const superAdminCount = await prisma.user.count({
      where: { isSuperAdmin: true },
    });

    if (superAdminCount <= 1) {
      return NextResponse.json(
        { error: 'Cannot remove the last super admin' },
        { status: 400 }
      );
    }

    // Remove super admin privileges
    await prisma.user.update({
      where: { id },
      data: { isSuperAdmin: false },
    });

    return NextResponse.json({ message: 'Super admin privileges removed' });
  } catch (error) {
    console.error('Remove super admin error:', error);
    return NextResponse.json(
      { error: 'Failed to remove super admin' },
      { status: 500 }
    );
  }
}
