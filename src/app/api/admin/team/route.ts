import { NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { withErrorHandler } from '@/lib/http/handler';

/**
 * Derive display role from permission flags
 * Priority: ADMIN > HR > FINANCE > OPERATIONS > MANAGER > EMPLOYEE
 */
function deriveRole(member: {
  isAdmin: boolean;
  hasHRAccess: boolean;
  hasFinanceAccess: boolean;
  hasOperationsAccess: boolean;
  canApprove: boolean;
}): string {
  if (member.isAdmin) return 'ADMIN';
  if (member.hasHRAccess) return 'HR';
  if (member.hasFinanceAccess) return 'FINANCE';
  if (member.hasOperationsAccess) return 'OPERATIONS';
  if (member.canApprove) return 'MANAGER';
  return 'EMPLOYEE';
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/admin/team - Get organization members
// ═══════════════════════════════════════════════════════════════════════════════

export const GET = withErrorHandler(async (_request, { tenant }) => {
  const tenantId = tenant!.tenantId;

  // Query members
  const members = await prisma.teamMember.findMany({
    where: {
      tenantId,
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
      department: true,
    },
    orderBy: [
      { isOwner: 'desc' },
      { isAdmin: 'desc' },
      { joinedAt: 'asc' },
    ],
  });

  // Query auth data from User table by email
  const emails = members.map((m) => m.email.toLowerCase());
  const users = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: {
      email: true,
      setupToken: true,
      setupTokenExpiry: true,
      passwordHash: true,
    },
  });

  // Create maps for quick lookup by email
  const userAuthMap = new Map(users.map((u) => [u.email.toLowerCase(), u]));

  // Create set of members with passwords
  const membersWithPasswordSet = new Set(
    members
      .filter((m) => userAuthMap.get(m.email.toLowerCase())?.passwordHash)
      .map((m) => m.id)
  );

  // Fetch pending SSO invitations (for pending detection)
  const pendingInvitations = await prisma.organizationInvitation.findMany({
    where: {
      organizationId: tenantId,
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

  // Get org auth config
  const org = await prisma.organization.findUnique({
    where: { id: tenantId },
    select: {
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
    // 1. Credentials pending: has setupToken but no password set
    // 2. SSO pending: has matching invitation that's not accepted
    const userAuth = userAuthMap.get(m.email.toLowerCase());
    const hasPassword = membersWithPasswordSet.has(m.id);
    const credentialsPending = !!(userAuth?.setupToken && !hasPassword);
    const ssoInvite = pendingInviteMap.get(m.email.toLowerCase());
    const ssoPending = !!ssoInvite;

    let pendingStatus: {
      isPending: boolean;
      type: 'credentials' | 'sso' | null;
      message: string | null;
      isExpired?: boolean;
      expiresAt?: Date;
    } | null = null;

    if (credentialsPending) {
      const tokenExpiry = userAuth?.setupTokenExpiry;
      const isExpired = tokenExpiry ? new Date(tokenExpiry) < new Date() : false;
      pendingStatus = {
        isPending: true,
        type: 'credentials',
        message: isExpired ? 'Setup link expired' : 'Awaiting password setup',
        isExpired,
        expiresAt: tokenExpiry || undefined,
      };
    } else if (ssoPending && ssoInvite) {
      const isExpired = new Date(ssoInvite.expiresAt) < new Date();
      pendingStatus = {
        isPending: true,
        type: 'sso',
        message: isExpired ? 'Invitation expired' : 'Awaiting invitation acceptance',
        isExpired,
        expiresAt: ssoInvite.expiresAt,
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
      // Derived role from permission flags
      role: deriveRole(m),
      isOwner: m.isOwner,
      joinedAt: m.joinedAt,
      isEmployee: m.isEmployee,
      employeeCode: m.employeeCode,
      designation: m.designation,
      department: m.department,
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
    authConfig: {
      allowedMethods,
      hasCredentials,
      hasSSO,
      hasCustomGoogleOAuth,
      hasCustomAzureOAuth,
    },
  });
}, { requireAuth: true, requireAdmin: true });
