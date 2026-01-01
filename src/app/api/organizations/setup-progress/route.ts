/**
 * @file route.ts
 * @description API endpoint for organization setup progress tracking
 * @module api/organizations/setup-progress
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { z } from 'zod';
import {
  getSetupProgress,
  updateSetupProgress,
  updateSetupProgressBulk,
  CHECKLIST_ITEMS,
  type SetupProgressField,
} from '@/lib/domains/system/setup';

const VALID_FIELDS: SetupProgressField[] = [
  'profileComplete',
  'logoUploaded',
  'brandingConfigured',
  'firstAssetAdded',
  'firstTeamMemberInvited',
  'firstEmployeeAdded',
];

const updateProgressSchema = z.object({
  field: z.enum([
    'profileComplete',
    'logoUploaded',
    'brandingConfigured',
    'firstAssetAdded',
    'firstTeamMemberInvited',
    'firstEmployeeAdded',
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
    firstEmployeeAdded: z.boolean().optional(),
  }).passthrough(), // Allow extra fields without failing
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/organizations/setup-progress - Get setup progress status
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = await getSetupProgress(session.user.organizationId);

    // Also get organization info for additional context
    const org = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
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
  } catch (error) {
    console.error('Get setup progress error:', error);
    return NextResponse.json({ error: 'Failed to get setup progress' }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUT /api/organizations/setup-progress - Update setup progress
// ═══════════════════════════════════════════════════════════════════════════════

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Check if it's a single field update or bulk update
    if ('field' in body) {
      // Single field update
      const result = updateProgressSchema.safeParse(body);
      if (!result.success) {
        console.error('[Setup Progress] Single field validation failed:', result.error.flatten());
        return NextResponse.json(
          { error: 'Validation failed', details: result.error.flatten().fieldErrors },
          { status: 400 }
        );
      }

      const { field, value } = result.data;
      const progress = await updateSetupProgress(session.user.organizationId, field, value);
      const status = await getSetupProgress(session.user.organizationId);

      return NextResponse.json({ progress, status });
    } else if ('updates' in body) {
      // Bulk update
      const result = bulkUpdateSchema.safeParse(body);
      if (!result.success) {
        console.error('[Setup Progress] Bulk validation failed:', result.error.flatten());
        console.error('[Setup Progress] Received body:', JSON.stringify(body));
        return NextResponse.json(
          { error: 'Validation failed', details: result.error.flatten(), received: body },
          { status: 400 }
        );
      }

      const progress = await updateSetupProgressBulk(
        session.user.organizationId,
        result.data.updates as Partial<Record<SetupProgressField, boolean>>
      );
      const status = await getSetupProgress(session.user.organizationId);

      return NextResponse.json({ progress, status });
    }

    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  } catch (error) {
    console.error('Update setup progress error:', error);
    return NextResponse.json({ error: 'Failed to update setup progress' }, { status: 500 });
  }
}
