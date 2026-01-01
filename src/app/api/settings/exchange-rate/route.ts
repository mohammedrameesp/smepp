import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';

const EXCHANGE_RATE_KEY = 'USD_TO_QAR_RATE';
const DEFAULT_RATE = '3.64';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = session.user.organizationId;

    // Get exchange rate from database (tenant-scoped)
    const setting = await prisma.systemSettings.findUnique({
      where: {
        tenantId_key: { tenantId, key: EXCHANGE_RATE_KEY },
      },
    });

    const rate = setting?.value || DEFAULT_RATE;

    return NextResponse.json({
      rate: parseFloat(rate),
      lastUpdated: setting?.updatedAt || null,
      updatedById: setting?.updatedById || null,
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
    if (!session || session.user.teamMemberRole !== 'ADMIN') {
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

    const tenantId = session.user.organizationId!;

    // Update or create setting (tenant-scoped)
    // Note: session.user.id is TeamMember ID when isTeamMember is true
    const memberId = session.user.isTeamMember ? session.user.id : null;
    const setting = await prisma.systemSettings.upsert({
      where: {
        tenantId_key: { tenantId, key: EXCHANGE_RATE_KEY },
      },
      create: {
        key: EXCHANGE_RATE_KEY,
        value: rateNum.toString(),
        updatedById: memberId,
        tenantId,
      },
      update: {
        value: rateNum.toString(),
        updatedById: memberId,
      },
      include: {
        updatedBy: {
          select: { name: true, email: true },
        },
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        actorMemberId: memberId,
        action: 'UPDATE_EXCHANGE_RATE',
        entityType: 'SystemSettings',
        entityId: setting.id,
        payload: {
          oldRate: rate,
          newRate: rateNum,
        },
        tenantId: session.user.organizationId!,
      },
    });

    return NextResponse.json({
      success: true,
      rate: parseFloat(setting.value),
      lastUpdated: setting.updatedAt,
      updatedBy: setting.updatedBy?.name || setting.updatedBy?.email,
    });
  } catch (error) {
    console.error('Update exchange rate error:', error);
    return NextResponse.json(
      { error: 'Failed to update exchange rate' },
      { status: 500 }
    );
  }
}
