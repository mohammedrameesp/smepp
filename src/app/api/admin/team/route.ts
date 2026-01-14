import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import logger from '@/lib/core/log';

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/admin/team - Get organization members
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
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
        isAdmin: true,
        hasOperationsAccess: true,
        hasHRAccess: true,
        hasFinanceAccess: true,
        canApprove: true,
        isOwner: true,
        joinedAt: true,
        createdAt: true,
        isEmployee: true,
        employeeCode: true,
        designation: true,
        setupToken: true, // For credentials pending detection
        passwordHash: true, // For credentials pending detection
      },
      orderBy: [
        { isOwner: 'desc' },
        { isAdmin: 'desc' },
        { joinedAt: 'asc' },
      ],
    });

    // Fetch pending SSO invitations (for pending detection)
    const pendingInvitations = await prisma.organizationInvitation.findMany({
      where: {
        organizationId: session.user.organizationId,
        acceptedAt: null,
      },
      select: {
        email: true,
        expiresAt: true,
      },
    });

    // Create a map of pending SSO invitations by email
    const pendingInviteMap = new Map(
      pendingInvitations.map((inv) => [inv.email.toLowerCase(), inv])
    );

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

    // Determine pending status for each member
    const membersWithPendingStatus = members.map((m) => {
      // Check for pending status:
      // 1. Credentials pending: has setupToken but no passwordHash
      // 2. SSO pending: has matching invitation that's not accepted
      const credentialsPending = !!(m.setupToken && !m.passwordHash);
      const ssoInvite = pendingInviteMap.get(m.email.toLowerCase());
      const ssoPending = !!ssoInvite;

      let pendingStatus: {
        isPending: boolean;
        type: 'credentials' | 'sso' | null;
        message: string | null;
        isExpired?: boolean;
      } | null = null;

      if (credentialsPending) {
        pendingStatus = {
          isPending: true,
          type: 'credentials',
          message: 'Awaiting password setup',
        };
      } else if (ssoPending && ssoInvite) {
        const isExpired = new Date(ssoInvite.expiresAt) < new Date();
        pendingStatus = {
          isPending: true,
          type: 'sso',
          message: isExpired ? 'Invitation expired' : 'Awaiting invitation acceptance',
          isExpired,
        };
      }

      return {
        id: m.id,
        // Permission flags (new boolean-based system)
        isAdmin: m.isAdmin,
        hasOperationsAccess: m.hasOperationsAccess,
        hasHRAccess: m.hasHRAccess,
        hasFinanceAccess: m.hasFinanceAccess,
        canApprove: m.canApprove,
        // Legacy role field for backwards compatibility
        role: m.isAdmin ? 'ADMIN' : 'MEMBER',
        isOwner: m.isOwner,
        joinedAt: m.joinedAt,
        isEmployee: m.isEmployee,
        employeeCode: m.employeeCode,
        designation: m.designation,
        pendingStatus,
        user: {
          id: m.id,
          name: m.name,
          email: m.email,
          image: m.image,
          createdAt: m.createdAt,
        },
      };
    });

    return NextResponse.json({
      members: membersWithPendingStatus,
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
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to get team members');
    return NextResponse.json(
      { error: 'Failed to get team members' },
      { status: 500 }
    );
  }
}
