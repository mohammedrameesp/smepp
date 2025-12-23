import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  organizationName: z.string().min(2, 'Organization name must be at least 2 characters'),
});

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate a URL-friendly slug from organization name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Remove duplicate hyphens
    .substring(0, 50); // Limit length
}

/**
 * Ensure slug is unique by appending a number if needed
 */
async function ensureUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  while (await prisma.organization.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/auth/signup - Create new user and organization
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const result = signupSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, email, password, organizationName } = result.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Generate unique slug for organization
    const baseSlug = generateSlug(organizationName);
    const slug = await ensureUniqueSlug(baseSlug);

    // Create user and organization in a transaction
    const { user, organization } = await prisma.$transaction(async (tx) => {
      // Create user
      const newUser = await tx.user.create({
        data: {
          name,
          email: normalizedEmail,
          passwordHash,
          role: 'ADMIN', // First user is admin of their org
        },
      });

      // Create organization
      const newOrg = await tx.organization.create({
        data: {
          name: organizationName,
          slug,
          subscriptionTier: 'FREE',
          maxUsers: 5,
          maxAssets: 50,
        },
      });

      // Create organization membership (user is owner)
      await tx.organizationUser.create({
        data: {
          organizationId: newOrg.id,
          userId: newUser.id,
          role: 'OWNER',
          isOwner: true,
        },
      });

      return { user: newUser, organization: newOrg };
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Account created successfully',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Failed to create account. Please try again.' },
      { status: 500 }
    );
  }
}
