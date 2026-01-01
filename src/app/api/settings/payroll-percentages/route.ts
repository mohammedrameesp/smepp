import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';

const SETTINGS_KEY = 'salary_component_percentages';

const DEFAULT_PERCENTAGES = {
  basic: 60,
  housing: 20,
  transport: 10,
  food: 5,
  phone: 3,
  other: 2,
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = session.user.organizationId;

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
  } catch (error) {
    console.error('Payroll percentages GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payroll percentages' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { percentages } = body;

    if (!percentages) {
      return NextResponse.json({ error: 'Percentages are required' }, { status: 400 });
    }

    // Validate percentages
    const requiredKeys = ['basic', 'housing', 'transport', 'food', 'phone', 'other'];
    for (const key of requiredKeys) {
      if (typeof percentages[key] !== 'number' || percentages[key] < 0) {
        return NextResponse.json(
          { error: `Invalid ${key} percentage` },
          { status: 400 }
        );
      }
    }

    // Validate total equals 100
    const total = Object.values(percentages as Record<string, number>).reduce(
      (sum: number, val: number) => sum + val,
      0
    );
    if (Math.abs(total - 100) > 0.01) {
      return NextResponse.json(
        { error: `Percentages must total 100%. Current total: ${total.toFixed(1)}%` },
        { status: 400 }
      );
    }

    const tenantId = session.user.organizationId!;
    // Note: session.user.id is TeamMember ID when isTeamMember is true
    const memberId = session.user.isTeamMember ? session.user.id : null;

    // Upsert the setting (tenant-scoped)
    await prisma.systemSettings.upsert({
      where: {
        tenantId_key: { tenantId, key: SETTINGS_KEY },
      },
      update: {
        value: JSON.stringify(percentages),
        updatedById: memberId,
      },
      create: {
        key: SETTINGS_KEY,
        value: JSON.stringify(percentages),
        updatedById: memberId,
        tenantId,
      },
    });

    return NextResponse.json({ success: true, percentages });
  } catch (error) {
    console.error('Payroll percentages POST error:', error);
    return NextResponse.json(
      { error: 'Failed to save payroll percentages' },
      { status: 500 }
    );
  }
}
