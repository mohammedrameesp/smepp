/**
 * @file route.ts
 * @description Organization branding settings API - manage logo, colors, and company name
 * @module system/settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import logger from '@/lib/core/log';
import { validationErrorResponse, notFoundResponse } from '@/lib/http/errors';
import { withErrorHandler } from '@/lib/http/handler';
import { z } from 'zod';

const brandingSchema = z.object({
  logoUrl: z.string().url().optional().nullable(),
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional().nullable(),
  companyName: z.string().max(100).optional(),
});

export const GET = withErrorHandler(async (_request, { tenant }) => {
  const tenantId = tenant!.tenantId;

  const org = await prisma.organization.findUnique({
    where: { id: tenantId },
    select: {
      name: true,
      logoUrl: true,
      primaryColor: true,
      secondaryColor: true,
    },
  });

  if (!org) {
    return notFoundResponse('Organization');
  }

  return NextResponse.json({
    logoUrl: org.logoUrl || null,
    primaryColor: org.primaryColor || '#0f172a',
    secondaryColor: org.secondaryColor || null,
    companyName: org.name || 'Durj',
  });
}, { requireAuth: true });

export const PUT = withErrorHandler(async (request: NextRequest, { tenant }) => {
  const tenantId = tenant!.tenantId;
  const userId = tenant!.userId;

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
      actorMemberId: userId,
      action: 'BRANDING_UPDATED',
      payload: validation.data,
      tenantId,
    },
  });

  logger.info({
    userId,
    tenantId,
    settings: validation.data
  }, 'Branding settings updated');

  return NextResponse.json({ success: true });
}, { requireAuth: true, requireAdmin: true });

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes: Added JSDoc module documentation at top
 * Issues: None - branding settings properly secured with admin authorization,
 *         Zod validation for color hex codes and URLs, activity logging
 */
