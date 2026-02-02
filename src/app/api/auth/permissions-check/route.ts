/**
 * @file route.ts
 * @description Check current permissionsUpdatedAt for session refresh
 * @module api/auth/permissions-check
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session?.user?.isTeamMember) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the current permissionsUpdatedAt from database
    const member = await prisma.teamMember.findUnique({
      where: { id: session.user.id },
      select: { permissionsUpdatedAt: true },
    });

    if (!member) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      permissionsUpdatedAt: member.permissionsUpdatedAt?.toISOString() || null,
    });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes: None needed - file already has good JSDoc, proper auth checks
 * Issues: None
 */
