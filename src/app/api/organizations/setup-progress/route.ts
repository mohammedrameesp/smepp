/**
 * @file route.ts
 * @description API endpoint for organization setup progress tracking
 * @module api/organizations/setup-progress
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import logger from '@/lib/core/log';
import { z } from 'zod';
import {
  getSetupProgress,
  updateSetupProgress,
  updateSetupProgressBulk,
  CHECKLIST_ITEMS,
  type SetupProgressField,
} from '@/features/onboarding/lib';
import { withErrorHandler } from '@/lib/http/handler';
import { badRequestResponse } from '@/lib/http/errors';

const updateProgressSchema = z.object({
  field: z.enum([
    'profileComplete',
    'logoUploaded',
    'brandingConfigured',
    'firstAssetAdded',
    'firstTeamMemberInvited',
  ]),
  value: z.boolean().default(true),
});

const bulkUpdateSchema = z.object({
  updates: z.object({
    profileComplete: z.boolean().optional(),
    logoUploaded: z.boolean().optional(),
    brandingConfigured: z.boolean().optional(),
    firstAssetAdded: z.boolean().optional(),
    firstTeamMemberInvited: z.boolean().optional(),
  }).passthrough(), // Allow extra fields without failing
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/organizations/setup-progress - Get setup progress status
// ═══════════════════════════════════════════════════════════════════════════════

export const GET = withErrorHandler(async (_request, { tenant }) => {
  const tenantId = tenant!.tenantId;

  const status = await getSetupProgress(tenantId);

  // Also get organization info for additional context
  const org = await prisma.organization.findUnique({
    where: { id: tenantId },
    select: {
      logoUrl: true,
      primaryColor: true,
      onboardingCompleted: true,
    },
  });

  return NextResponse.json({
    ...status,
    checklistItems: CHECKLIST_ITEMS,
    organization: org,
  });
}, { requireAuth: true });

// ═══════════════════════════════════════════════════════════════════════════════
// PUT /api/organizations/setup-progress - Update setup progress
// ═══════════════════════════════════════════════════════════════════════════════

export const PUT = withErrorHandler(async (request: NextRequest, { tenant }) => {
  const tenantId = tenant!.tenantId;

  const body = await request.json();

  // Check if it's a single field update or bulk update
  if ('field' in body) {
    // Single field update
    const result = updateProgressSchema.safeParse(body);
    if (!result.success) {
      logger.error({ validationErrors: result.error.flatten() }, 'Setup progress single field validation failed');
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { field, value } = result.data;
    const progress = await updateSetupProgress(tenantId, field, value);
    const status = await getSetupProgress(tenantId);

    return NextResponse.json({ progress, status });
  } else if ('updates' in body) {
    // Bulk update
    const result = bulkUpdateSchema.safeParse(body);
    if (!result.success) {
      logger.error({ validationErrors: result.error.flatten() }, 'Setup progress bulk validation failed');
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten(), received: body },
        { status: 400 }
      );
    }

    const progress = await updateSetupProgressBulk(
      tenantId,
      result.data.updates as Partial<Record<SetupProgressField, boolean>>
    );
    const status = await getSetupProgress(tenantId);

    return NextResponse.json({ progress, status });
  }

  return badRequestResponse('Invalid request body');
}, { requireAuth: true });
