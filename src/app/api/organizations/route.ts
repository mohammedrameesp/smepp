import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

const createOrgSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  timezone: z.string().optional().default('UTC'),
  currency: z.string().optional().default('USD'),
});

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50);
}

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
// GET /api/organizations - Get user's organizations
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const memberships = await prisma.organizationUser.findMany({
      where: { userId: session.user.id },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            subscriptionTier: true,
            createdAt: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    const organizations = memberships.map((m) => ({
      ...m.organization,
      role: m.role,
      isOwner: m.isOwner,
    }));

    return NextResponse.json({ organizations });
  } catch (error) {
    console.error('Get organizations error:', error);
    return NextResponse.json(
      { error: 'Failed to get organizations' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/organizations - Create a new organization
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const result = createOrgSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, timezone, currency } = result.data;

    // Generate unique slug
    const baseSlug = generateSlug(name);
    const slug = await ensureUniqueSlug(baseSlug);

    // Create organization and membership
    const organization = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name,
          slug,
          timezone,
          currency,
          subscriptionTier: 'FREE',
          maxUsers: 5,
          maxAssets: 50,
        },
      });

      await tx.organizationUser.create({
        data: {
          organizationId: org.id,
          userId: session.user.id,
          role: 'OWNER',
          isOwner: true,
        },
      });

      return org;
    });

    return NextResponse.json(
      {
        success: true,
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create organization error:', error);
    return NextResponse.json(
      { error: 'Failed to create organization' },
      { status: 500 }
    );
  }
}
