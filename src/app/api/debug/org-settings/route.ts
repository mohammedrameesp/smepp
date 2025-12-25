import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';

// DEBUG ENDPOINT - Remove after testing
// GET /api/debug/org-settings - Check org settings and session
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.organizationId) {
      return NextResponse.json({
        error: 'No organization in session',
        session: session ? {
          userId: session.user.id,
          email: session.user.email,
          enabledModules: session.user.enabledModules,
        } : null
      });
    }

    // Get org from database
    const org = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      select: {
        id: true,
        name: true,
        slug: true,
        enabledModules: true,
        onboardingCompleted: true,
      },
    });

    return NextResponse.json({
      session: {
        userId: session.user.id,
        email: session.user.email,
        organizationId: session.user.organizationId,
        enabledModulesInSession: session.user.enabledModules,
      },
      database: {
        orgId: org?.id,
        orgName: org?.name,
        enabledModulesInDB: org?.enabledModules,
        onboardingCompleted: org?.onboardingCompleted,
      },
      match: JSON.stringify(session.user.enabledModules) === JSON.stringify(org?.enabledModules),
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({ error: 'Failed to fetch debug info' }, { status: 500 });
  }
}
