import { NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);

    // Update the user and invalidate existing sessions
    const user = await prisma.user.update({
      where: { email },
      data: {
        passwordHash,
        passwordChangedAt: new Date(), // SECURITY: Invalidates all existing sessions
      },
      select: { id: true, email: true, name: true },
    });

    return NextResponse.json({
      success: true,
      message: `Password updated for ${user.name} (${user.email})`,
    });

  } catch (error) {
    console.error('Set password failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
