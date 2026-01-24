/**
 * @file route.ts
 * @description API to toggle between admin and employee view modes
 * @module system/view-mode
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler } from '@/lib/http/handler';

const VIEW_MODE_COOKIE = 'durj-view-mode';
// SEC-HIGH-1: Reduced TTL from 8 hours to 1 hour for security
const VIEW_MODE_MAX_AGE = 60 * 60; // 1 hour

/**
 * GET /api/view-mode
 * Check current view mode
 */
export const GET = withErrorHandler(async (request: NextRequest, { tenant }) => {
  const viewModeCookie = request.cookies.get(VIEW_MODE_COOKIE);
  const isEmployeeView = viewModeCookie?.value === 'employee';
  const isAdmin = tenant?.isAdmin ?? false;

  return NextResponse.json({
    isEmployeeView,
    isAdmin,
    canToggle: isAdmin,
  });
}, { requireAuth: true, requireTenant: false });

/**
 * POST /api/view-mode
 * Set employee view mode (admin switches to employee view)
 */
export const POST = withErrorHandler(async () => {
  const response = NextResponse.json({
    success: true,
    viewMode: 'employee',
  });

  // Set the view mode cookie
  // SEC-HIGH-1: Using 'strict' sameSite to prevent CSRF attacks
  response.cookies.set(VIEW_MODE_COOKIE, 'employee', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: VIEW_MODE_MAX_AGE,
  });

  return response;
}, { requireAuth: true, requireAdmin: true });

/**
 * DELETE /api/view-mode
 * Clear view mode (return to admin view)
 */
export const DELETE = withErrorHandler(async () => {
  const response = NextResponse.json({
    success: true,
    viewMode: 'admin',
  });

  // Clear the view mode cookie
  response.cookies.delete(VIEW_MODE_COOKIE);

  return response;
}, { requireAuth: true });
