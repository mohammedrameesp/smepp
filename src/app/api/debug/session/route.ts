/**
 * @file route.ts
 * @description Debug endpoint to check session contents and admin access logic
 * @module api/debug/session
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'No session' }, { status: 401 });
  }

  // Simulate exact admin layout logic
  const isAdmin = session.user.isOwner || session.user.isAdmin;
  const hasAdminAccess = isAdmin ||
                         session.user.hasFinanceAccess ||
                         session.user.hasHRAccess ||
                         session.user.hasOperationsAccess ||
                         session.user.canApprove;

  return NextResponse.json({
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      isTeamMember: session.user.isTeamMember,
      isAdmin: session.user.isAdmin,
      isOwner: session.user.isOwner,
      canApprove: session.user.canApprove,
      hasHRAccess: session.user.hasHRAccess,
      hasFinanceAccess: session.user.hasFinanceAccess,
      hasOperationsAccess: session.user.hasOperationsAccess,
      permissionsUpdatedAt: session.user.permissionsUpdatedAt,
    },
    // Admin layout access check simulation
    adminAccessCheck: {
      isAdmin,
      hasAdminAccess,
      wouldRedirectToEmployee: !hasAdminAccess,
      breakdown: {
        'isOwner': session.user.isOwner,
        'isAdmin': session.user.isAdmin,
        'hasFinanceAccess': session.user.hasFinanceAccess,
        'hasHRAccess': session.user.hasHRAccess,
        'hasOperationsAccess': session.user.hasOperationsAccess,
        'canApprove': session.user.canApprove,
      }
    },
    timestamp: new Date().toISOString(),
  });
}
