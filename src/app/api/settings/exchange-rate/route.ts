import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

const EXCHANGE_RATE_KEY = 'USD_TO_QAR_RATE';
const DEFAULT_RATE = '3.64';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get exchange rate from database
    const setting = await prisma.systemSettings.findUnique({
      where: { key: EXCHANGE_RATE_KEY },
    });

    const rate = setting?.value || DEFAULT_RATE;

    return NextResponse.json({
      rate: parseFloat(rate),
      lastUpdated: setting?.updatedAt || null,
      updatedBy: setting?.updatedBy || null,
    });
  } catch (error) {
    console.error('Get exchange rate error:', error);
    return NextResponse.json(
      { error: 'Failed to get exchange rate' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { rate } = await request.json();

    // Validate rate
    const rateNum = parseFloat(rate);
    if (isNaN(rateNum) || rateNum <= 0) {
      return NextResponse.json(
        { error: 'Invalid exchange rate. Must be a positive number.' },
        { status: 400 }
      );
    }

    // Update or create setting
    const setting = await prisma.systemSettings.upsert({
      where: { key: EXCHANGE_RATE_KEY },
      create: {
        key: EXCHANGE_RATE_KEY,
        value: rateNum.toString(),
        updatedBy: session.user.id,
      },
      update: {
        value: rateNum.toString(),
        updatedBy: session.user.id,
      },
      include: {
        updater: {
          select: { name: true, email: true },
        },
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        actorUserId: session.user.id,
        action: 'UPDATE_EXCHANGE_RATE',
        entityType: 'SystemSettings',
        entityId: setting.id,
        payload: {
          oldRate: rate,
          newRate: rateNum,
        },
      },
    });

    return NextResponse.json({
      success: true,
      rate: parseFloat(setting.value),
      lastUpdated: setting.updatedAt,
      updatedBy: setting.updater?.name || setting.updater?.email,
    });
  } catch (error) {
    console.error('Update exchange rate error:', error);
    return NextResponse.json(
      { error: 'Failed to update exchange rate' },
      { status: 500 }
    );
  }
}
