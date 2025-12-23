import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { z } from 'zod';
import { validateSlug, isSlugAvailable } from '@/lib/multi-tenant/subdomain';
import { randomBytes } from 'crypto';
import { sendEmail } from '@/lib/core/email';

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

const createOrgSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  slug: z.string().min(3).max(63),
  adminEmail: z.string().email('Invalid email address'),
  adminName: z.string().optional(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/super-admin/organizations - List all organizations
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const organizations = await prisma.organization.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { members: true, assets: true },
        },
      },
    });

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
// POST /api/super-admin/organizations - Create organization and invite admin
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const result = createOrgSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, slug, adminEmail, adminName } = result.data;

    // Validate slug
    const slugValidation = validateSlug(slug);
    if (!slugValidation.valid) {
      return NextResponse.json({ error: slugValidation.error }, { status: 400 });
    }

    // Check availability
    const available = await isSlugAvailable(slug);
    if (!available) {
      return NextResponse.json(
        { error: 'This subdomain is already taken' },
        { status: 409 }
      );
    }

    // Generate invitation token
    const inviteToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create organization and invitation in transaction
    const organization = await prisma.$transaction(async (tx) => {
      // Create organization
      const org = await tx.organization.create({
        data: {
          name,
          slug: slug.toLowerCase(),
          subscriptionTier: 'FREE',
          maxUsers: 5,
          maxAssets: 50,
        },
      });

      // Create invitation for first admin
      await tx.organizationInvitation.create({
        data: {
          organizationId: org.id,
          email: adminEmail.toLowerCase(),
          role: 'OWNER',
          token: inviteToken,
          expiresAt,
        },
      });

      return org;
    });

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${inviteToken}`;

    // Send invitation email
    const emailResult = await sendEmail({
      to: adminEmail,
      subject: `You're invited to manage ${name} on SME++`,
      html: `
        <h2>Welcome to SME++!</h2>
        <p>You've been invited to be the administrator of <strong>${name}</strong>.</p>
        <p><a href="${inviteUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px;">Accept Invitation</a></p>
        <p>Or copy this link: ${inviteUrl}</p>
        <p>This invitation expires in 7 days.</p>
      `,
      text: `Welcome to SME++! You've been invited to manage ${name}. Accept here: ${inviteUrl}`,
    });

    return NextResponse.json(
      {
        success: true,
        emailSent: emailResult.success,
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
        },
        invitation: {
          email: adminEmail,
          inviteUrl,
          expiresAt: expiresAt.toISOString(),
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
