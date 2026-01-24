import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { DEFAULT_RATES_TO_QAR } from '@/lib/core/currency';
import { withErrorHandler } from '@/lib/http/handler';
import { badRequestResponse } from '@/lib/http/errors';

function getExchangeRateKey(currency: string, primaryCurrency: string): string {
  return `${currency}_TO_${primaryCurrency}_RATE`;
}

export const GET = withErrorHandler(async (request: NextRequest, { tenant }) => {
  const tenantId = tenant!.tenantId;
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

  const rate = setting?.value || DEFAULT_RATES_TO_QAR[currency]?.toString() || '1.00';

  return NextResponse.json({
    currency,
    primaryCurrency,
    rate: parseFloat(rate),
    lastUpdated: setting?.updatedAt || null,
    updatedById: setting?.updatedById || null,
  });
}, { requireAuth: true });

export const PUT = withErrorHandler(async (request: NextRequest, { tenant }) => {
  const tenantId = tenant!.tenantId;
  const userId = tenant!.userId;

  const { currency, rate } = await request.json();

  // Validate rate
  const rateNum = parseFloat(rate);
  if (isNaN(rateNum) || rateNum <= 0) {
    return badRequestResponse('Invalid exchange rate. Must be a positive number.');
  }

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
  const setting = await prisma.systemSettings.upsert({
    where: {
      tenantId_key: { tenantId, key },
    },
    create: {
      key,
      value: rateNum.toString(),
      updatedById: userId,
      tenantId,
    },
    update: {
      value: rateNum.toString(),
      updatedById: userId,
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
      actorMemberId: userId,
      action: 'UPDATE_EXCHANGE_RATE',
      entityType: 'SystemSettings',
      entityId: setting.id,
      payload: {
        currency: currencyCode,
        primaryCurrency,
        oldRate: rate,
        newRate: rateNum,
      },
      tenantId,
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
}, { requireAuth: true, requireAdmin: true });
