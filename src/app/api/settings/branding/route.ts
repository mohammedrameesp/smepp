import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { Role } from '@prisma/client';
import logger from '@/lib/core/log';
import { formatErrorResponse, validationErrorResponse } from '@/lib/http/errors';
import { z } from 'zod';

const brandingSchema = z.object({
  logoUrl: z.string().url().optional().nullable(),
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional().nullable(),
  companyName: z.string().max(100).optional(),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return formatErrorResponse('Organization context required', 403);
    }

    const org = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      select: {
        name: true,
        logoUrl: true,
        primaryColor: true,
        secondaryColor: true,
      },
    });

    if (!org) {
      return formatErrorResponse('Organization not found', 404);
    }

    return NextResponse.json({
      logoUrl: org.logoUrl || null,
      primaryColor: org.primaryColor || '#1E40AF',
      secondaryColor: org.secondaryColor || null,
      companyName: org.name || 'Durj',
    });

  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Failed to fetch branding settings');
    return formatErrorResponse('Failed to fetch branding settings', 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return formatErrorResponse('Organization context required', 403);
    }
    if (session.user.role !== Role.ADMIN) {
      return formatErrorResponse('Admin access required', 403);
    }

    const tenantId = session.user.organizationId;
    const body = await request.json();
    const validation = brandingSchema.safeParse(body);

    if (!validation.success) {
      return validationErrorResponse(validation, 'Invalid branding data');
    }

    const { logoUrl, primaryColor, secondaryColor, companyName } = validation.data;

    // Build update object only for provided fields
    const updateData: Record<string, string | null> = {};
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
    if (primaryColor !== undefined) updateData.primaryColor = primaryColor;
    if (secondaryColor !== undefined) updateData.secondaryColor = secondaryColor;
    if (companyName !== undefined) updateData.name = companyName;

    // Update organization branding
    await prisma.organization.update({
      where: { id: tenantId },
      data: updateData,
    });

    // Log the activity
    await prisma.activityLog.create({
      data: {
        actorUserId: session.user.id,
        action: 'BRANDING_UPDATED',
        payload: validation.data,
        tenantId,
      },
    });

    logger.info({
      userId: session.user.id,
      tenantId,
      settings: validation.data
    }, 'Branding settings updated');

    return NextResponse.json({ success: true });

  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Failed to update branding settings');
    return formatErrorResponse('Failed to update branding settings', 500);
  }
}
