import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { badRequestResponse } from '@/lib/http/errors';

const SETTINGS_KEY = 'salary_component_percentages';

const DEFAULT_PERCENTAGES = {
  basic: 60,
  housing: 20,
  transport: 10,
  food: 5,
  phone: 3,
  other: 2,
};

export const GET = withErrorHandler(async (_request, { tenant }) => {
  const tenantId = tenant!.tenantId;

  const setting = await prisma.systemSettings.findUnique({
    where: {
      tenantId_key: { tenantId, key: SETTINGS_KEY },
    },
  });

  if (!setting) {
    return NextResponse.json({ percentages: DEFAULT_PERCENTAGES });
  }

  try {
    const percentages = JSON.parse(setting.value);
    return NextResponse.json({ percentages });
  } catch {
    return NextResponse.json({ percentages: DEFAULT_PERCENTAGES });
  }
}, { requireAuth: true, requireModule: 'payroll' });

export const POST = withErrorHandler(async (request: NextRequest, { tenant }) => {
  const tenantId = tenant!.tenantId;
  const userId = tenant!.userId;

  const body = await request.json();
  const { percentages } = body;

  if (!percentages) {
    return badRequestResponse('Percentages are required');
  }

  // Validate percentages
  const requiredKeys = ['basic', 'housing', 'transport', 'food', 'phone', 'other'];
  for (const key of requiredKeys) {
    if (typeof percentages[key] !== 'number' || percentages[key] < 0) {
      return badRequestResponse(`Invalid ${key} percentage`);
    }
  }

  // Validate total equals 100
  const total = Object.values(percentages as Record<string, number>).reduce(
    (sum: number, val: number) => sum + val,
    0
  );
  if (Math.abs(total - 100) > 0.01) {
    return badRequestResponse(`Percentages must total 100%. Current total: ${total.toFixed(1)}%`);
  }

  // Upsert the setting (tenant-scoped)
  await prisma.systemSettings.upsert({
    where: {
      tenantId_key: { tenantId, key: SETTINGS_KEY },
    },
    update: {
      value: JSON.stringify(percentages),
      updatedById: userId,
    },
    create: {
      key: SETTINGS_KEY,
      value: JSON.stringify(percentages),
      updatedById: userId,
      tenantId,
    },
  });

  return NextResponse.json({ success: true, percentages });
}, { requireAuth: true, requireAdmin: true, requireModule: 'payroll' });
