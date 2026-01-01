import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';

/**
 * GET /api/emails/check?email=user@example.com
 *
 * Check if an email is available for use (not already registered)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json(
      { error: 'Email parameter is required' },
      { status: 400 }
    );
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json(
      {
        available: false,
        valid: false,
        error: 'Please enter a valid email address',
      },
      { status: 200 }
    );
  }

  // Check if email already exists (case-insensitive)
  const existingUser = await prisma.user.findFirst({
    where: {
      email: {
        equals: email.toLowerCase(),
        mode: 'insensitive',
      },
    },
    select: { id: true },
  });

  return NextResponse.json(
    {
      email: email.toLowerCase(),
      available: !existingUser,
      valid: true,
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic';
