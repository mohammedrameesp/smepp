import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/core/prisma';
import { QATAR_EMPLOYMENT_DEFAULTS, type EmploymentSettings } from '@/lib/domains/hr';
import { withErrorHandler } from '@/lib/http/handler';
import { badRequestResponse } from '@/lib/http/errors';

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

export const GET = withErrorHandler(async (_request, { tenant }) => {
  const tenantId = tenant!.tenantId;

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
}, { requireAuth: true });

export const POST = withErrorHandler(async (request: NextRequest, { tenant }) => {
  const tenantId = tenant!.tenantId;
  const userId = tenant!.userId;

  const body = await request.json();
  const { settings } = body;

  if (!settings) {
    return badRequestResponse('Settings are required');
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
    return badRequestResponse('Each tier must have a unique service duration threshold');
  }

  // Ensure there's a tier starting at 0 months
  const hasZeroTier = validatedSettings.noticePeriodTiers.some(t => t.minServiceMonths === 0);
  if (!hasZeroTier) {
    return badRequestResponse('At least one tier must start at 0 months of service');
  }

  // Upsert the setting (tenant-scoped)
  await prisma.systemSettings.upsert({
    where: {
      tenantId_key: { tenantId, key: SETTINGS_KEY },
    },
    update: {
      value: JSON.stringify(validatedSettings),
      updatedById: userId,
    },
    create: {
      key: SETTINGS_KEY,
      value: JSON.stringify(validatedSettings),
      updatedById: userId,
      tenantId,
    },
  });

  return NextResponse.json({ success: true, settings: validatedSettings });
}, { requireAuth: true, requireAdmin: true });
