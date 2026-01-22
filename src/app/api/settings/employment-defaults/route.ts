import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import logger from '@/lib/core/log';
import { QATAR_EMPLOYMENT_DEFAULTS, type EmploymentSettings } from '@/lib/domains/hr';

const SETTINGS_KEY = 'employment_defaults';

const noticePeriodTierSchema = z.object({
  minServiceMonths: z.number().int().min(0),
  noticeDays: z.number().int().min(1).max(180),
});

const employmentSettingsSchema = z.object({
  probationDurationMonths: z.number().int().min(0).max(6),
  probationNoticePeriodDays: z.number().int().min(0).max(30),
  noticePeriodTiers: z.array(noticePeriodTierSchema).min(1),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.organizationId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const tenantId = session.user.organizationId;

    const setting = await prisma.systemSettings.findUnique({
      where: {
        tenantId_key: { tenantId, key: SETTINGS_KEY },
      },
    });

    if (!setting) {
      return NextResponse.json({ settings: QATAR_EMPLOYMENT_DEFAULTS });
    }

    try {
      const settings = JSON.parse(setting.value) as EmploymentSettings;
      return NextResponse.json({ settings });
    } catch {
      return NextResponse.json({ settings: QATAR_EMPLOYMENT_DEFAULTS });
    }
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      'Employment defaults GET error'
    );
    return NextResponse.json(
      { error: 'Failed to fetch employment defaults' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 });
    }

    const body = await request.json();
    const { settings } = body;

    if (!settings) {
      return NextResponse.json({ error: 'Settings are required' }, { status: 400 });
    }

    // Validate settings structure
    const validationResult = employmentSettingsSchema.safeParse(settings);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid settings format', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const validatedSettings = validationResult.data;

    // Validate that notice period tiers are properly ordered (minServiceMonths should be unique)
    const serviceMonthsSet = new Set(validatedSettings.noticePeriodTiers.map(t => t.minServiceMonths));
    if (serviceMonthsSet.size !== validatedSettings.noticePeriodTiers.length) {
      return NextResponse.json(
        { error: 'Each tier must have a unique service duration threshold' },
        { status: 400 }
      );
    }

    // Ensure there's a tier starting at 0 months
    const hasZeroTier = validatedSettings.noticePeriodTiers.some(t => t.minServiceMonths === 0);
    if (!hasZeroTier) {
      return NextResponse.json(
        { error: 'At least one tier must start at 0 months of service' },
        { status: 400 }
      );
    }

    const tenantId = session.user.organizationId!;
    const memberId = session.user.isTeamMember ? session.user.id : null;

    // Upsert the setting (tenant-scoped)
    await prisma.systemSettings.upsert({
      where: {
        tenantId_key: { tenantId, key: SETTINGS_KEY },
      },
      update: {
        value: JSON.stringify(validatedSettings),
        updatedById: memberId,
      },
      create: {
        key: SETTINGS_KEY,
        value: JSON.stringify(validatedSettings),
        updatedById: memberId,
        tenantId,
      },
    });

    return NextResponse.json({ success: true, settings: validatedSettings });
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      'Employment defaults POST error'
    );
    return NextResponse.json(
      { error: 'Failed to save employment defaults' },
      { status: 500 }
    );
  }
}
