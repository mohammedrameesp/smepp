import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/admin/team - Get organization members
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only org admins/owners can view team
    if (session.user.orgRole !== 'OWNER' && session.user.orgRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const members = await prisma.teamMember.findMany({
      where: {
        tenantId: session.user.organizationId,
        isDeleted: false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        isOwner: true,
        joinedAt: true,
        createdAt: true,
        isEmployee: true,
        employeeCode: true,
        designation: true,
      },
      orderBy: [
        { isOwner: 'desc' },
        { role: 'asc' },
        { joinedAt: 'asc' },
      ],
    });

    // Get org limits and auth config
    const org = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      select: {
        maxUsers: true,
        allowedAuthMethods: true,
        customGoogleClientId: true,
        customGoogleClientSecret: true,
        customAzureClientId: true,
        customAzureClientSecret: true,
      },
    });

    // Compute auth config
    const allowedMethods = org?.allowedAuthMethods || [];
    const hasCustomGoogleOAuth = !!(org?.customGoogleClientId && org?.customGoogleClientSecret);
    const hasCustomAzureOAuth = !!(org?.customAzureClientId && org?.customAzureClientSecret);
    const hasSSO = hasCustomGoogleOAuth || hasCustomAzureOAuth;
    const hasCredentials = allowedMethods.length === 0 || allowedMethods.includes('credentials');

    return NextResponse.json({
      members: members.map((m) => ({
        id: m.id,
        role: m.role,
        isOwner: m.isOwner,
        joinedAt: m.joinedAt,
        isEmployee: m.isEmployee,
        employeeCode: m.employeeCode,
        designation: m.designation,
        user: {
          id: m.id,
          name: m.name,
          email: m.email,
          image: m.image,
          createdAt: m.createdAt,
        },
      })),
      limits: {
        maxUsers: org?.maxUsers || 5,
        currentUsers: members.length,
      },
      authConfig: {
        allowedMethods,
        hasCredentials,
        hasSSO,
        hasCustomGoogleOAuth,
        hasCustomAzureOAuth,
      },
    });
  } catch (error) {
    console.error('Get team error:', error);
    return NextResponse.json(
      { error: 'Failed to get team members' },
      { status: 500 }
    );
  }
}
