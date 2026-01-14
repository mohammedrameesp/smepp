/**
 * @file route.ts
 * @description Manage custom domain for an organization (Super Admin only)
 * @module api/super-admin/organizations/[id]/custom-domain
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { z } from 'zod';
import logger from '@/lib/core/log';
import {
  validateCustomDomain,
  generateTxtVerificationValue,
  verifyCustomDomain,
  isDomainAvailable,
  clearDomainCache,
  getCustomDomainInfo,
} from '@/lib/multi-tenant/custom-domain';

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

const setDomainSchema = z.object({
  customDomain: z.string().min(1).max(253),
});

const patchSchema = z.object({
  action: z.enum(['verify', 'bypass']),
  bypass: z.boolean().optional(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET - Get custom domain status
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const org = await prisma.organization.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        customDomain: true,
        customDomainVerified: true,
        customDomainVerifiedAt: true,
        customDomainTxtValue: true,
        customDomainBypassVerification: true,
      },
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    return NextResponse.json({
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
      },
      customDomain: {
        domain: org.customDomain,
        verified: org.customDomainVerified,
        verifiedAt: org.customDomainVerifiedAt,
        txtValue: org.customDomainTxtValue,
        bypassVerification: org.customDomainBypassVerification,
        isActive: org.customDomain && (org.customDomainVerified || org.customDomainBypassVerification),
      },
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown' }, 'Get custom domain error');
    return NextResponse.json({ error: 'Failed to get custom domain' }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST - Set/update custom domain
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const result = setDomainSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { customDomain } = result.data;

    // Validate domain format
    const validation = validateCustomDomain(customDomain);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const normalizedDomain = validation.normalizedDomain!;

    // Check organization exists
    const org = await prisma.organization.findUnique({
      where: { id },
      select: { id: true, customDomain: true },
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Check if domain is available
    if (!(await isDomainAvailable(normalizedDomain, id))) {
      return NextResponse.json(
        { error: 'This domain is already in use by another organization' },
        { status: 409 }
      );
    }

    // Clear old domain from cache if changed
    if (org.customDomain && org.customDomain !== normalizedDomain) {
      clearDomainCache(org.customDomain);
    }

    // Generate new TXT verification value
    const txtValue = generateTxtVerificationValue(id);

    // Update organization
    const updated = await prisma.organization.update({
      where: { id },
      data: {
        customDomain: normalizedDomain,
        customDomainVerified: false,
        customDomainVerifiedAt: null,
        customDomainTxtValue: txtValue,
        customDomainBypassVerification: false,
      },
      select: {
        id: true,
        customDomain: true,
        customDomainTxtValue: true,
      },
    });

    logger.info({ orgId: id, domain: normalizedDomain }, 'Custom domain set');

    return NextResponse.json({
      success: true,
      customDomain: {
        domain: updated.customDomain,
        txtValue: updated.customDomainTxtValue,
        verified: false,
        isActive: false,
        instructions: {
          step1: `Add a TXT record to your DNS for: ${normalizedDomain}`,
          step2: `Or add it to: _durj-verification.${normalizedDomain}`,
          recordValue: txtValue,
          note: 'DNS changes may take up to 48 hours to propagate',
        },
      },
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown' }, 'Set custom domain error');
    return NextResponse.json({ error: 'Failed to set custom domain' }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH - Verify domain or toggle bypass
// ═══════════════════════════════════════════════════════════════════════════════

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const result = patchSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Get organization
    const org = await prisma.organization.findUnique({
      where: { id },
      select: {
        id: true,
        customDomain: true,
        customDomainTxtValue: true,
        customDomainVerified: true,
        customDomainBypassVerification: true,
      },
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    if (!org.customDomain) {
      return NextResponse.json({ error: 'No custom domain configured' }, { status: 400 });
    }

    const { action, bypass } = result.data;

    // Handle verify action
    if (action === 'verify') {
      if (!org.customDomainTxtValue) {
        return NextResponse.json({ error: 'No verification value set' }, { status: 400 });
      }

      const verification = await verifyCustomDomain(
        org.customDomain,
        org.customDomainTxtValue
      );

      if (verification.verified) {
        const updated = await prisma.organization.update({
          where: { id },
          data: {
            customDomainVerified: true,
            customDomainVerifiedAt: new Date(),
          },
        });

        clearDomainCache(org.customDomain);

        logger.info({ orgId: id, domain: org.customDomain }, 'Custom domain verified');

        return NextResponse.json({
          success: true,
          verified: true,
          message: 'Domain verification successful',
          verifiedAt: updated.customDomainVerifiedAt,
        });
      }

      return NextResponse.json({
        success: false,
        verified: false,
        error: verification.error,
        txtRecordsFound: verification.txtRecordsFound,
        expectedValue: org.customDomainTxtValue,
      });
    }

    // Handle bypass toggle
    if (action === 'bypass') {
      if (bypass === undefined) {
        return NextResponse.json({ error: 'bypass value is required' }, { status: 400 });
      }

      const updated = await prisma.organization.update({
        where: { id },
        data: {
          customDomainBypassVerification: bypass,
        },
      });

      clearDomainCache(org.customDomain);

      logger.info({ orgId: id, domain: org.customDomain, bypass }, 'Custom domain bypass toggled');

      return NextResponse.json({
        success: true,
        bypassVerification: updated.customDomainBypassVerification,
        isActive: org.customDomainVerified || updated.customDomainBypassVerification,
        message: bypass
          ? 'Verification bypassed - domain is now active'
          : 'Bypass disabled - DNS verification required',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown' }, 'Patch custom domain error');
    return NextResponse.json({ error: 'Failed to update custom domain' }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE - Remove custom domain
// ═══════════════════════════════════════════════════════════════════════════════

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const org = await prisma.organization.findUnique({
      where: { id },
      select: { id: true, customDomain: true },
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    if (org.customDomain) {
      clearDomainCache(org.customDomain);
    }

    await prisma.organization.update({
      where: { id },
      data: {
        customDomain: null,
        customDomainVerified: false,
        customDomainVerifiedAt: null,
        customDomainTxtValue: null,
        customDomainBypassVerification: false,
      },
    });

    logger.info({ orgId: id, domain: org.customDomain }, 'Custom domain removed');

    return NextResponse.json({
      success: true,
      message: 'Custom domain removed',
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown' }, 'Delete custom domain error');
    return NextResponse.json({ error: 'Failed to remove custom domain' }, { status: 500 });
  }
}
