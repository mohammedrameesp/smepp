/**
 * @file route.ts
 * @description API to toggle between admin and employee view modes
 * @module system/view-mode
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';

const VIEW_MODE_COOKIE = 'durj-view-mode';
const VIEW_MODE_MAX_AGE = 8 * 60 * 60; // 8 hours

/**
 * GET /api/view-mode
 * Check current view mode
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const viewModeCookie = request.cookies.get(VIEW_MODE_COOKIE);
  const isEmployeeView = viewModeCookie?.value === 'employee';
  const isAdmin = session.user.teamMemberRole === 'ADMIN';

  return NextResponse.json({
    isEmployeeView,
    isAdmin,
    canToggle: isAdmin,
  });
}

/**
 * POST /api/view-mode
 * Set employee view mode (admin switches to employee view)
 */
export async function POST() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only admins can toggle view mode
  if (session.user.teamMemberRole !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Only administrators can switch view modes' },
      { status: 403 }
    );
  }

  const response = NextResponse.json({
    success: true,
    viewMode: 'employee',
  });

  // Set the view mode cookie
  response.cookies.set(VIEW_MODE_COOKIE, 'employee', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: VIEW_MODE_MAX_AGE,
  });

  return response;
}

/**
 * DELETE /api/view-mode
 * Clear view mode (return to admin view)
 */
export async function DELETE() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const response = NextResponse.json({
    success: true,
    viewMode: 'admin',
  });

  // Clear the view mode cookie
  response.cookies.delete(VIEW_MODE_COOKIE);

  return response;
}
