import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import logger from '@/lib/core/log';

// Default rates for common currencies to primary currency (QAR)
const DEFAULT_RATES: Record<string, string> = {
  USD: '3.64',
  EUR: '3.96',
  GBP: '4.60',
  SAR: '0.97',
  AED: '0.99',
  KWD: '11.85',
};

function getExchangeRateKey(currency: string, primaryCurrency: string): string {
  return `${currency}_TO_${primaryCurrency}_RATE`;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.organizationId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const tenantId = session.user.organizationId;
    const { searchParams } = new URL(request.url);
    const currency = searchParams.get('currency') || 'USD';

    // Get organization's primary currency
    const org = await prisma.organization.findUnique({
      where: { id: tenantId },
      select: { currency: true },
    });
    const primaryCurrency = org?.currency || 'QAR';

    // Get exchange rate from database (tenant-scoped)
    const key = getExchangeRateKey(currency, primaryCurrency);
    const setting = await prisma.systemSettings.findUnique({
      where: {
        tenantId_key: { tenantId, key },
      },
    });

    const rate = setting?.value || DEFAULT_RATES[currency] || '1.00';

    return NextResponse.json({
      currency,
      primaryCurrency,
      rate: parseFloat(rate),
      lastUpdated: setting?.updatedAt || null,
      updatedById: setting?.updatedById || null,
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Get exchange rate error');
    return NextResponse.json(
      { error: 'Failed to get exchange rate' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { currency, rate } = await request.json();

    // Validate rate
    const rateNum = parseFloat(rate);
    if (isNaN(rateNum) || rateNum <= 0) {
      return NextResponse.json(
        { error: 'Invalid exchange rate. Must be a positive number.' },
        { status: 400 }
      );
    }

    const tenantId = session.user.organizationId!;

    // Get organization's primary currency
    const org = await prisma.organization.findUnique({
      where: { id: tenantId },
      select: { currency: true },
    });
    const primaryCurrency = org?.currency || 'QAR';

    // Get key for this currency pair
    const currencyCode = currency || 'USD';
    const key = getExchangeRateKey(currencyCode, primaryCurrency);

    // Update or create setting (tenant-scoped)
    const memberId = session.user.isTeamMember ? session.user.id : null;
    const setting = await prisma.systemSettings.upsert({
      where: {
        tenantId_key: { tenantId, key },
      },
      create: {
        key,
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
          currency: currencyCode,
          primaryCurrency,
          oldRate: rate,
          newRate: rateNum,
        },
        tenantId: session.user.organizationId!,
      },
    });

    return NextResponse.json({
      success: true,
      currency: currencyCode,
      primaryCurrency,
      rate: parseFloat(setting.value),
      lastUpdated: setting.updatedAt,
      updatedBy: setting.updatedBy?.name || setting.updatedBy?.email,
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Update exchange rate error');
    return NextResponse.json(
      { error: 'Failed to update exchange rate' },
      { status: 500 }
    );
  }
}
