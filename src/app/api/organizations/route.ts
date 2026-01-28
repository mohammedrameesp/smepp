import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import logger from '@/lib/core/log';
import { z } from 'zod';
import {
  validateSlug,
  getOrganizationUrl,
} from '@/lib/multi-tenant/subdomain';
import { deriveOrgRole } from '@/lib/access-control';

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

const createOrgSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  slug: z.string().min(3).max(63).optional(), // Optional custom slug
  timezone: z.string().optional().default('UTC'),
  currency: z.string().optional().default('USD'),
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/organizations - Get user's organizations
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const memberships = await prisma.teamMember.findMany({
      where: { id: session.user.id, isDeleted: false },
      include: {
        tenant: {
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
      ...m.tenant,
      role: deriveOrgRole(m),
      isOwner: m.isOwner,
    }));

    return NextResponse.json({ organizations });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Get organizations error');
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
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const result = createOrgSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, slug: customSlug, timezone, currency } = result.data;

    // Validate custom slug format if provided (before transaction)
    if (customSlug) {
      const validation = validateSlug(customSlug);
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        );
      }
    }

    // Create organization and membership in a serializable transaction
    // This prevents race conditions with slug uniqueness
    const organization = await prisma.$transaction(async (tx) => {
      // Determine slug inside transaction for atomicity
      let slug: string;

      if (customSlug) {
        // Check availability inside transaction
        const existingOrg = await tx.organization.findUnique({
          where: { slug: customSlug.toLowerCase() },
          select: { id: true },
        });

        if (existingOrg) {
          throw new Error('SLUG_TAKEN');
        }

        slug = customSlug.toLowerCase();
      } else {
        // Generate unique slug from name - check inside transaction
        const baseSlug = name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .substring(0, 50);

        // Find all existing slugs that match the pattern
        const existingSlugs = await tx.organization.findMany({
          where: {
            slug: {
              startsWith: baseSlug,
            },
          },
          select: { slug: true },
        });

        const existingSlugSet = new Set(existingSlugs.map(o => o.slug));

        // Find first available slug
        if (!existingSlugSet.has(baseSlug)) {
          slug = baseSlug;
        } else {
          let counter = 1;
          while (existingSlugSet.has(`${baseSlug}-${counter}`)) {
            counter++;
          }
          slug = `${baseSlug}-${counter}`;
        }
      }

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

      // Initialize setup progress tracking for the new organization
      await tx.organizationSetupProgress.create({
        data: { organizationId: org.id },
      });

      // Create owner as TeamMember with userId FK
      await tx.teamMember.create({
        data: {
          tenantId: org.id,
          userId: session.user.id,
          email: session.user.email!.toLowerCase(), // Denormalized for queries
          name: session.user.name,
          isAdmin: true,
          isOwner: true,
          canLogin: true,
          isEmployee: false, // Owner is not automatically an employee
          joinedAt: new Date(),
        },
      });

      return org;
    }, {
      isolationLevel: 'Serializable',
    });

    // Get the subdomain URL for the new organization
    const subdomainUrl = getOrganizationUrl(organization.slug);

    return NextResponse.json(
      {
        success: true,
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          url: subdomainUrl,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Create organization error');

    // Handle slug taken error
    if (error instanceof Error && error.message === 'SLUG_TAKEN') {
      return NextResponse.json(
        { error: 'This subdomain is already taken' },
        { status: 409 }
      );
    }

    // Handle unique constraint violations (concurrent creation)
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'This subdomain was just taken. Please try a different one.' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create organization' },
      { status: 500 }
    );
  }
}
