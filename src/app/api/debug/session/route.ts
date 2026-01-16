/**
 * @file route.ts
 * @description Debug endpoint to check session contents
 * @module api/debug/session
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'No session' }, { status: 401 });
  }

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
  });
}
